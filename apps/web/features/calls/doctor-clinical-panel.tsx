"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Plus, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { FormSelect } from "@/features/patients/form-controls";
import { WorkspaceProvider } from "@/features/workspace/workspace-provider";
import { useSafety, SafetyProvider } from "@/features/workspace/safety-provider";
import { ConsultationPage } from "@/features/consultations/consultation-pages";
import { PatientContext } from "@/features/consultations/patient-context";
import { StaffReleases } from "@/features/portal/staff-releases";
import { errorMessage } from "@/lib/auth/client";
import { ClinicalPanelFrame } from "./clinical-panel-frame";
import { AftercareComposer } from "./aftercare";
import { callRequest, type CallState, type ClinicalContext } from "./client";
import { callDate } from "./call-format";

export function DoctorClinicalPanel({
  state,
  open,
  close,
  ended,
  busy,
  refresh,
  publish,
}: {
  state: CallState;
  open: boolean;
  close: () => void;
  ended: boolean;
  busy: boolean;
  refresh: () => void;
  publish: (steps: string, followUp: string) => Promise<boolean>;
}) {
  const [loaded, setLoaded] = useState(open);
  useEffect(() => {
    if (open) setLoaded(true);
  }, [open]);
  if (state.role !== "doctor" || !state.organization_id || !state.patient_id) return null;
  return (
    <ClinicalPanelFrame open={open} close={close} patient={state.patient ?? "Patient"}>
      {loaded && (
        <Suspense fallback={<p role="status">Opening the clinical workspace…</p>}>
          <SafetyProvider>
            <WorkspaceProvider pinnedOrganizationId={state.organization_id}>
              <ClinicalContent
                state={state}
                ended={ended}
                busy={busy}
                refresh={refresh}
                publish={publish}
              />
            </WorkspaceProvider>
          </SafetyProvider>
        </Suspense>
      )}
    </ClinicalPanelFrame>
  );
}

function ClinicalContent({
  state,
  ended,
  busy,
  refresh,
  publish,
}: {
  state: CallState;
  ended: boolean;
  busy: boolean;
  refresh: () => void;
  publish: (steps: string, followUp: string) => Promise<boolean>;
}) {
  const { guard } = useSafety();
  const [context, setContext] = useState<ClinicalContext | null>(null);
  const [selected, setSelected] = useState(state.encounter_id ?? "");
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);
  const [tab, setTab] = useState("notes");
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const value = await callRequest<ClinicalContext>("clinical_context", state.id, {}, signal);
        if (signal?.aborted) return;
        setContext(value);
        setSelected((current) => current || value.encounter_id || "");
        setFailure("");
      } catch (failure) {
        if (!signal?.aborted) setFailure(errorMessage(failure));
      }
    },
    [state.id],
  );
  useEffect(() => {
    if (ended) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, ended]);
  async function connect(existing = false) {
    if (pending || ended) return;
    setPending(true);
    setFailure("");
    try {
      const value = await callRequest<ClinicalContext>("connect_encounter", state.id, {
        expected_version: state.version,
        ...(existing ? { encounter_id: selected } : {}),
      });
      setContext(value);
      setSelected(value.encounter_id ?? "");
      refresh();
    } catch (failure) {
      setFailure(errorMessage(failure));
      refresh();
    } finally {
      setPending(false);
    }
  }
  const currentId = context?.encounter_id ?? state.encounter_id;
  const choices = context?.recent ?? [];
  return (
    <div className="grid min-w-0 gap-5">
      <p className="text-xs leading-6 text-muted-foreground">
        Collapsing keeps this workspace mounted. Save through the consultation editor. Ending the
        call does not finalize the clinical record.
      </p>
      <div
        role="group"
        aria-label="Clinical workspace sections"
        className="flex flex-wrap gap-2 border-b border-border pb-4"
      >
        {[
          ["notes", "Consultation notes"],
          ["history", "Patient history"],
          ["sharing", "Next steps & releases"],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={tab === value ? "secondary" : "ghost"}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {failure && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 p-3 text-sm text-destructive"
        >
          {failure}
          {!ended && (
            <Button variant="ghost" onClick={() => void load()}>
              Reload clinical context
            </Button>
          )}
        </div>
      )}
      <div hidden={tab !== "notes"} className="grid min-w-0 gap-4">
        {!currentId && !ended && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <p className="max-w-md text-sm leading-6">
              No consultation is linked to this room. Create one for this patient or choose your
              existing consultation below.
            </p>
            <Button disabled={pending} onClick={() => void connect()}>
              <Plus aria-hidden className="size-4" />
              {pending ? "Opening…" : "Create consultation"}
            </Button>
          </div>
        )}
        {!!choices.length && (
          <div className="grid gap-2">
            <label htmlFor="call-consultation" className="text-sm font-medium">
              Consultation
            </label>
            <FormSelect
              id="call-consultation"
              value={selected}
              onChange={(event) => {
                const value = event.target.value;
                void guard(() => setSelected(value));
              }}
            >
              <option value="">Choose a consultation</option>
              {currentId && !choices.some((item) => item.id === currentId) && (
                <option value={currentId}>Linked consultation</option>
              )}
              {choices.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.reason} · {item.provider_name} · {callDate(item.created_at, state.timezone)}{" "}
                  · {item.status}
                </option>
              ))}
            </FormSelect>
            <p className="text-xs leading-5 text-muted-foreground">
              History can be read under your existing permissions. Linking requires your provider,
              this patient and this branch.
            </p>
            {!currentId && selected && !ended && (
              <Button
                variant="outline"
                className="justify-self-start"
                disabled={pending}
                onClick={() => void connect(true)}
              >
                <Link2 aria-hidden className="size-4" />
                Link selected consultation to this room
              </Button>
            )}
          </div>
        )}
        {selected ? (
          <ConsultationPage key={selected} encounterId={selected} focused initialSection="notes" />
        ) : ended ? (
          <p className="text-sm leading-6 text-muted-foreground">
            The call has closed. Open the patient record to create or select a consultation using
            your clinic account.
          </p>
        ) : !context && !failure ? (
          <p role="status" className="text-sm">
            Loading this patient’s consultation history…
          </p>
        ) : null}
        <ButtonLink
          variant="outline"
          href={`/clinic/patients/${state.patient_id}?organization=${state.organization_id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open full patient record in another tab
        </ButtonLink>
      </div>
      <div hidden={tab !== "history"}>
        <PatientContext patientId={state.patient_id!} />
      </div>
      <div hidden={tab !== "sharing"} className="grid gap-6">
        <div hidden={ended}>
          <AftercareComposer state={state} busy={busy || ended} publish={publish} />
        </div>
        {ended && (
          <p className="text-sm text-muted-foreground">
            Room instructions cannot be shared after the call closes. Use an explicit patient-portal
            release for further instructions.
          </p>
        )}
        <StaffReleases patientId={state.patient_id!} />
      </div>
    </div>
  );
}
