"use client";

import { FilteredConsultations } from "./filtered-consultations";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/features/patients/form-controls";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { usePatientDraft } from "@/features/patients/use-patient-draft";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { PageHeading, LoadState, RemoteNotice, failureText } from "@/features/patients/feedback";
import { useRemote } from "@/features/patients/use-remote";
import { getGraphqlClient } from "@/lib/graphql/client";
import {
  ConsultationDocument,
  ConsultationSetupDocument,
  CreateConsultationDocument,
  OperationsActionDocument,
  type ConsultationSetupQuery,
} from "@/lib/graphql/generated";
import { EncounterEditor } from "./encounter-editor";

export function ConsultationList({ patientId }: { patientId?: string }) {
  const { href, can } = useWorkspace();
  return (
    <section>
      <PageHeading
        title={patientId ? "Consultation history" : "Consultations"}
        description="Walk-in care, saved drafts, and preserved visit revisions."
      >
        {can("encounters.write") && (
          <ButtonLink
            href={
              patientId
                ? `${href("/clinic/consultations/new")}&patient=${patientId}`
                : href("/clinic/patients")
            }
          >
            {patientId ? "Start consultation" : "Choose patient to begin"}
          </ButtonLink>
        )}
      </PageHeading>
      <FilteredConsultations patientId={patientId} />
    </section>
  );
}

export function ConsultationPage({ encounterId }: { encounterId: string }) {
  const { organizationId } = useWorkspace();
  const params = useSearchParams();
  const revisionId = params.get("revision");
  const remote = useRemote(ConsultationDocument, { organizationId, encounterId, revisionId });
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  return (
    <>
      <RemoteNotice error={remote.error} retry={remote.reload} />
      <EncounterEditor
        key={`${organizationId}:${encounterId}:${revisionId ?? "current"}`}
        initial={remote.data.encounter}
        exactRevision={!!revisionId}
        reload={remote.reload}
      />
    </>
  );
}

export function NewConsultation() {
  const { organizationId, href, can } = useWorkspace();
  const params = useSearchParams();
  const patientId = params.get("patient");
  if (!patientId || !can("encounters.write"))
    return (
      <>
        <PageHeading title="Start a consultation" />
        <p className="mb-5 text-sm">
          Choose an authorized patient record to begin a walk-in visit.
        </p>
        <ButtonLink href={href("/clinic/patients")}>Choose patient</ButtonLink>
      </>
    );
  return <ConsultationSetup organizationId={organizationId} patientId={patientId} />;
}

function ConsultationSetup({
  organizationId,
  patientId,
}: {
  organizationId: string;
  patientId: string;
}) {
  const remote = useRemote(ConsultationSetupDocument, { organizationId, patientId });
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  return (
    <StartForm key={`${organizationId}:${patientId}`} data={remote.data} patientId={patientId} />
  );
}

function StartForm({ data, patientId }: { data: ConsultationSetupQuery; patientId: string }) {
  const query = useSearchParams();
  const { organizationId, href } = useWorkspace();
  const capture = useRequestScope();
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const form = useForm({
    defaultValues: {
      reason: "",
      providerId: data.providers[0]?.id ?? "",
      requestId: crypto.randomUUID(),
    },
  });
  const providerId = useWatch({ control: form.control, name: "providerId" });
  usePatientDraft(`${organizationId}:${patientId}:start-consultation`, form);
  useUnsavedChanges(
    `${organizationId}:${patientId}:start-consultation`,
    form.formState.isDirty,
    () => form.reset(),
  );
  async function submit(values: { reason: string; providerId: string; requestId: string }) {
    const isCurrent = capture();
    setError(null);
    try {
      const result = await getGraphqlClient().request(CreateConsultationDocument, {
        organizationId,
        patientId,
        providerId: values.providerId,
        branchId: data.patientDemographics.branchId,
        reason: values.reason,
        requestId: values.requestId,
      });
      if (isCurrent() && query.get("ticket") && query.get("ticketVersion")) {
        await getGraphqlClient().request(OperationsActionDocument, {
          organizationId,
          action: "link",
          data: {
            id: query.get("ticket"),
            expected_version: Number(query.get("ticketVersion")),
            encounter_id: result.createEncounter.id,
          },
          requestId: values.requestId,
        });
      }
      if (isCurrent()) {
        form.reset({
          reason: "",
          providerId: data.providers[0]?.id ?? "",
          requestId: crypto.randomUUID(),
        });
        router.push(href(`/clinic/consultations/${result.createEncounter.id}`));
      }
    } catch (failure) {
      if (isCurrent()) setError(failure);
    }
  }
  if (!data.providers.length)
    return (
      <>
        <PageHeading title="Provider profile needed" />
        <p className="text-sm">
          Your active clinic membership needs a provider profile before you can start a
          consultation. Contact your clinic administrator.
        </p>
      </>
    );
  return (
    <div className="max-w-3xl">
      <PageHeading
        title="Start a consultation"
        description={`${data.patientDemographics.fullName} · ${data.patientDemographics.reference}`}
      />
      <div className="mb-8 rounded-lg border border-border bg-muted p-5">
        <p className="font-medium">
          Allergy review:{" "}
          {data.patientClinicalHistory?.allergyState.replaceAll("_", " ") ?? "unreviewed"}
        </p>
        {data.patientClinicalHistory?.allergies.map((allergy) => (
          <p key={allergy.substance} className="mt-2 text-sm">
            {allergy.substance} · {allergy.reaction || "Reaction not recorded"} · {allergy.severity}
          </p>
        ))}
        <p className="mt-3 text-sm">
          Medication review:{" "}
          {data.patientClinicalHistory?.medicationState.replaceAll("_", " ") ?? "unreviewed"}
        </p>
        {data.patientClinicalHistory?.medications.map((medication) => (
          <p key={medication.name} className="mt-1 text-sm">
            {medication.name} {medication.dose} {medication.frequency}
          </p>
        ))}
      </div>
      <form noValidate onSubmit={form.handleSubmit(submit)} className="grid gap-6">
        <input type="hidden" {...form.register("requestId")} />
        <FormSelect
          id="provider"
          label="Responsible provider"
          value={providerId}
          onChange={(value) => form.setValue("providerId", value, { shouldDirty: true })}
          options={data.providers.map((provider) => ({
            value: provider.id,
            label: `${provider.displayName} (${provider.specialty.replaceAll("_", " ")})`,
          }))}
        />
        <FormField
          id="visitReason"
          label="Reason for visit"
          error={form.formState.errors.reason?.message}
        >
          <Input
            id="visitReason"
            {...form.register("reason", {
              required: "Enter a reason for the consultation.",
              maxLength: 240,
              validate: (value) => !!value.trim() || "Enter a reason for the consultation.",
            })}
            maxLength={240}
            aria-invalid={!!form.formState.errors.reason}
            aria-describedby={form.formState.errors.reason ? "visitReason-help" : undefined}
          />
        </FormField>
        {error !== null && (
          <p role="alert" className="text-sm text-destructive">
            {failureText(error)}
          </p>
        )}
        <Button
          disabled={form.formState.isSubmitting}
          aria-busy={form.formState.isSubmitting}
          className="justify-self-start"
        >
          Start walk-in consultation
        </Button>
      </form>
    </div>
  );
}
