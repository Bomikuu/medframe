"use client";

import { AccessRequired } from "@/components/application/access-required";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety, useUnsavedChanges } from "@/features/workspace/safety-provider";
import { usePatientDraft } from "@/features/patients/use-patient-draft";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState } from "@/features/patients/feedback";
import { PatientRecordDocument, type PatientRowFragment } from "@/lib/graphql/generated";
import { encounterFormSchema, type EncounterForm } from "@/features/consultations/schema";
import { SoapFields } from "@/features/consultations/soap-fields";
import { DiagnosisFields } from "@/features/consultations/diagnosis-fields";
import { ProcedureFields } from "@/features/consultations/procedure-fields";
import { DentalEditor } from "@/features/dental/dental-editor";
import { AnatomyEditor } from "@/features/anatomy/anatomy-editor";
import { ClinicalAlerts } from "./clinical-alerts";
import { WalkInDetails, type WalkInIdentity } from "./walk-in-details";
import { stationRequest } from "./client";
import { errorMessage } from "@/lib/auth/client";

type ProvisionalForm = EncounterForm & { requestId: string };
export function WalkInEditor() {
  const { organizationId, can } = useWorkspace();
  const patientId = useSearchParams().get("patient");
  const patient = useRemote(
    PatientRecordDocument,
    { organizationId, patientId: patientId ?? "" },
    { enabled: !!patientId },
  );
  if (!can("encounters.write"))
    return (
      <AccessRequired
        title="Provider access required"
        description="An active clinical provider membership is required."
      />
    );
  if (patientId && !patient.data) return <LoadState error={patient.error} retry={patient.reload} />;
  return (
    <ProvisionalEditor
      key={`${organizationId}:${patientId ?? "walk-in"}`}
      patient={patient.data?.patientDemographics}
    />
  );
}
function ProvisionalEditor({ patient }: { patient?: PatientRowFragment }) {
  const { organizationId, overview, href } = useWorkspace();
  const router = useRouter();
  const { putDraft } = useSafety();
  const [tab, setTab] = useState("dental");
  const [details, setDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const form = useForm<ProvisionalForm>({
    defaultValues: {
      requestId: crypto.randomUUID(),
      expectedVersion: 1,
      content: {
        soap: { subjective: "", objective: "", assessment: "", plan: "" },
        diagnoses: [],
        observations: [],
        findings: [],
        anatomy_findings: [],
        procedures: [],
        document_ids: [],
      },
    },
    resolver: zodResolver(encounterFormSchema.safeExtend({ requestId: z.string().uuid() })),
  });
  const key = `${overview.currentUser.id}:${organizationId}:station-walk-in:${patient?.id ?? "unnamed"}`;
  usePatientDraft(key, form);
  useUnsavedChanges(key, form.formState.isDirty, () => form.reset());
  async function finish() {
    if (pending || busy) return;
    const valid = await form.trigger();
    if (valid) {
      setError("");
      setDetails(true);
    } else {
      setError("Check required findings and the combined draft size before saving.");
      setTab("notes");
    }
  }
  async function save(identity: WalkInIdentity) {
    setBusy(true);
    setError("");
    try {
      const result = await stationRequest<{ encounter_id: string }>("walk-in", {
        organization_id: organizationId,
        request_id: form.getValues("requestId"),
        content: form.getValues("content"),
        ...identity,
      });
      form.reset();
      putDraft(key, undefined);
      router.push(href(`/station/clinician/consultations/${result.encounter_id}`));
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }
  const navigation = (
    <div className="flex flex-wrap gap-1">
      {[
        ["notes", "Notes"],
        ["dental", "Dental"],
        ["anatomy", "Anatomy"],
        ["procedures", "Procedures"],
      ].map(([value, label]) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={tab === value ? "secondary" : "ghost"}
          onClick={() => setTab(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
  const actions = (
    <Button type="button" disabled={busy || pending} onClick={() => void finish()}>
      Confirm patient & save
    </Button>
  );
  const context = patient ? (
    <ClinicalAlerts patientId={patient.id} active />
  ) : (
    <p className="max-w-lg text-xs leading-5 text-amber-800 dark:text-amber-200">
      Patient identity, allergies, medications and history are unconfirmed. This is an unsaved
      walk-in draft.
    </p>
  );
  const patientName = patient?.fullName ?? "Walk-in · patient details pending";
  return (
    <FormProvider {...form}>
      <div className="grid gap-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{patientName}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Memory-only draft · confirm patient details before saving
            </p>
          </div>
          <div className="flex gap-2">
            <ButtonLink variant="outline" href={href("/station/clinician")}>
              Station home
            </ButtonLink>
            {actions}
          </div>
        </header>
        {context}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="notes">Notes & diagnoses</TabsTrigger>
            <TabsTrigger value="dental">Dental chart</TabsTrigger>
            <TabsTrigger value="anatomy">Anatomy</TabsTrigger>
            <TabsTrigger value="procedures">Procedures</TabsTrigger>
          </TabsList>
          <TabsContent value="notes" forceMount className="data-[state=inactive]:hidden">
            <div className="grid gap-7 rounded-xl border border-border bg-card p-5">
              <SoapFields readOnly={busy} />
              <DiagnosisFields readOnly={busy} />
            </div>
          </TabsContent>
          <TabsContent value="dental" forceMount className="data-[state=inactive]:hidden">
            <DentalEditor
              active={tab === "dental"}
              readOnly={busy}
              patientId={patient?.id}
              patientName={patientName}
              reason="Provisional consultation"
              encounterStatus="unsaved walk-in"
              onExit={() => setTab("notes")}
              actions={actions}
              feedback="Unsaved · confirm patient details to save"
              navigation={navigation}
              onPatientRecord={() => setTab("notes")}
              onPendingChange={setPending}
              clinicalContext={context}
            />
          </TabsContent>
          <TabsContent value="anatomy" forceMount className="data-[state=inactive]:hidden">
            <AnatomyEditor
              active={tab === "anatomy"}
              readOnly={busy}
              patientId={patient?.id}
              save={finish}
              consultation={{
                patientName,
                patientId: patient?.id,
                status: "unsaved walk-in",
                saveStatus: "Memory-only draft · confirm patient before saving",
                busy,
                canComplete: !busy,
                canFinalize: false,
                onComplete: () => void finish(),
                onFinalize: () => void finish(),
                onBack: () => setTab("notes"),
                navigation,
                clinicalContext: context,
                stationActions: actions,
              }}
            />
          </TabsContent>
          <TabsContent value="procedures" forceMount className="data-[state=inactive]:hidden">
            <div className="rounded-xl border border-border bg-card p-5">
              <ProcedureFields readOnly={busy} />
            </div>
          </TabsContent>
        </Tabs>
        <p className="text-xs leading-5 text-muted-foreground">
          Link the patient before attaching documents, accessing longitudinal history, treatment
          plans or billing. Refreshing or ending this session discards unsaved input.
        </p>
        {error && !details && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {details && (
          <WalkInDetails
            initialPatient={patient}
            busy={busy}
            error={error}
            onClose={() => setDetails(false)}
            onSave={(identity) => void save(identity)}
          />
        )}
      </div>
    </FormProvider>
  );
}
