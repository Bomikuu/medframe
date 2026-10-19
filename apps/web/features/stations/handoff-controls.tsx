"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { errorMessage, requestWithCsrf } from "@/lib/auth/client";
import { TemporaryCode } from "./code-input";
import { stationRequest, type Transfer } from "./client";
import type { EditingControl } from "./use-editing-lease";

export function HandoffControls({
  control,
  encounterId,
  save,
  hasUnsaved,
  busy,
  freeze,
}: {
  control: EditingControl;
  encounterId: string;
  save: () => Promise<number | null>;
  hasUnsaved: () => boolean;
  busy: boolean;
  freeze: (value: boolean) => void;
}) {
  const { organizationId } = useWorkspace();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("device");
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
  const [provider, setProvider] = useState("");
  const [summary, setSummary] = useState("");
  const [tasks, setTasks] = useState("");
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const scope = { organization_id: organizationId, encounter_id: encounterId };
  async function show() {
    setOpen(true);
    setError("");
    try {
      const result = await stationRequest<{ providers: { id: string; name: string }[] }>(
        "encounter",
        { ...scope, action: "providers" },
      );
      setProviders(result.providers);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  async function offer() {
    setWorking(true);
    freeze(true);
    setError("");
    try {
      const version = await save();
      if (version === null || hasUnsaved())
        throw new Error(
          "Save was not acknowledged or new input remains. Save your draft before creating a handoff.",
        );
      const result = await stationRequest<Transfer>("handoff", {
        ...scope,
        action: "offer",
        handoff: {
          expected_version: version,
          kind,
          provider_id: kind === "responsibility" ? provider : null,
          summary: kind === "responsibility" ? summary : "",
          tasks: kind === "responsibility" ? tasks : "",
          selection: control.selection.current,
        },
      });
      setTransfer(result);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setWorking(false);
      freeze(false);
    }
  }
  async function cancel() {
    if (!transfer) return;
    setWorking(true);
    setError("");
    try {
      await stationRequest("handoff", { ...scope, action: "cancel", handoff_id: transfer.id });
      setTransfer(null);
      setOpen(false);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setWorking(false);
    }
  }
  async function lock() {
    setWorking(true);
    freeze(true);
    setError("");
    try {
      const version = await save();
      if (version === null || hasUnsaved())
        throw new Error("Save your remaining input before locking this Station.");
      await control.refresh("lock");
      await requestWithCsrf("auth/logout", {});
      router.replace("/station");
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      control.setError(errorMessage(cause));
    } finally {
      setWorking(false);
      freeze(false);
    }
  }
  return (
    <>
      {control.canEdit ? (
        <>
          <Button
            type="button"
            variant="outline"
            disabled={busy || working}
            onClick={() => void show()}
            className="min-h-11"
          >
            <ArrowRightLeft />
            <span className="hidden sm:inline">Continue elsewhere</span>
            <span className="sm:hidden">Handoff</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Save and lock Station"
            disabled={busy || working}
            onClick={() => void lock()}
          >
            <LockKeyhole />
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={working}
          onClick={() => {
            setWorking(true);
            void control
              .refresh("claim")
              .catch((cause) => control.setError(errorMessage(cause)))
              .finally(() => setWorking(false));
          }}
        >
          {control.lease?.mine
            ? "Resume editing"
            : control.lease?.live
              ? "Editing on another device"
              : "Claim editing"}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="z-[120] max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogTitle>Continue on another device</DialogTitle>
          <DialogDescription>
            The receiving device must be paired, approved and signed in. Your current device keeps
            control until the named clinician accepts.
          </DialogDescription>
          {transfer ? (
            <div className="mt-3 grid gap-5">
              <TemporaryCode code={transfer.code} expiresAt={transfer.expires_at} />
              <p className="text-sm leading-6 text-muted-foreground">
                On the receiving tablet, open Station and choose Receive a handoff. New saves
                invalidate this code. Expiry leaves this device in control.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={working}
                onClick={() => void cancel()}
              >
                Cancel pending handoff
              </Button>
            </div>
          ) : (
            <div className="mt-3 grid gap-5">
              <FormSelect
                id="handoff-kind"
                label="What should move?"
                value={kind}
                onChange={setKind}
                options={[
                  { value: "device", label: "Same clinician, another device" },
                  { value: "responsibility", label: "Hand responsibility to another clinician" },
                ]}
              />
              {kind === "responsibility" && (
                <>
                  <FormSelect
                    id="handoff-provider"
                    label="Receiving clinician"
                    value={provider}
                    onChange={setProvider}
                    options={[
                      { value: "", label: "Choose an existing clinician" },
                      ...providers.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                  />
                  <FormField id="handoff-summary" label="Handoff summary">
                    <Textarea
                      id="handoff-summary"
                      value={summary}
                      maxLength={1200}
                      onChange={(e) => setSummary(e.target.value)}
                      rows={3}
                    />
                  </FormField>
                  <FormField id="handoff-tasks" label="Outstanding tasks">
                    <Textarea
                      id="handoff-tasks"
                      value={tasks}
                      maxLength={1200}
                      onChange={(e) => setTasks(e.target.value)}
                      rows={3}
                    />
                  </FormField>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Acceptance changes the responsible provider on unfinished care. Existing patient
                    access is still required; active linked queue responsibility must be resolved
                    first.
                  </p>
                </>
              )}
              <Button
                type="button"
                disabled={working || (kind === "responsibility" && (!provider || !summary.trim()))}
                onClick={() => void offer()}
              >
                {working ? "Saving and preparing…" : "Save & generate handoff code"}
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
