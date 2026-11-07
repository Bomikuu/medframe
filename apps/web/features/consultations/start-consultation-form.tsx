"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { AccessRequired } from "@/components/application/access-required";
import { ReasonField } from "@/components/application/reason-field";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/features/patients/form-controls";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { usePatientDraft } from "@/features/patients/use-patient-draft";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { LoadState, failureText } from "@/features/patients/feedback";
import { useRemote } from "@/features/patients/use-remote";
import { getGraphqlClient } from "@/lib/graphql/client";
import {
  ConsultationSetupDocument,
  CreateConsultationDocument,
  OperationsActionDocument,
  type ConsultationSetupQuery,
} from "@/lib/graphql/generated";
import { reasonSuggestions } from "@/lib/reason-suggestions";

export function ConsultationSetup({
  organizationId,
  patientId,
  onBusyChange,
}: {
  organizationId: string;
  patientId: string;
  onBusyChange: (busy: boolean) => void;
}) {
  const remote = useRemote(ConsultationSetupDocument, { organizationId, patientId });
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  return (
    <StartForm
      key={`${organizationId}:${patientId}`}
      data={remote.data}
      patientId={patientId}
      onBusyChange={onBusyChange}
    />
  );
}

function StartForm({
  data,
  patientId,
  onBusyChange,
}: {
  data: ConsultationSetupQuery;
  patientId: string;
  onBusyChange: (busy: boolean) => void;
}) {
  const query = useSearchParams();
  const { organizationId, href } = useWorkspace();
  const capture = useRequestScope();
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const initialProvider =
    data.providers.find((row) => row.id === query.get("provider"))?.id ??
    data.providers[0]?.id ??
    "";
  const form = useForm({
    defaultValues: {
      reason: "",
      providerId: initialProvider,
      requestId: crypto.randomUUID(),
    },
  });
  useEffect(() => {
    onBusyChange(form.formState.isSubmitting);
    return () => onBusyChange(false);
  }, [form.formState.isSubmitting, onBusyChange]);
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
          providerId: initialProvider,
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
      <AccessRequired
        title="Provider profile needed"
        description="Your active clinic membership needs a provider profile before you can start a consultation."
      />
    );
  return (
    <div className="grid gap-5">
      <div className="border-b border-border pb-4">
        <p className="text-base font-semibold">{data.patientDemographics.fullName}</p>
        <p className="mt-1 text-xs text-muted-foreground">{data.patientDemographics.reference}</p>
      </div>
      <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
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
          personKind="provider"
          value={providerId}
          onChange={(value) => form.setValue("providerId", value, { shouldDirty: true })}
          options={data.providers.map((provider) => ({
            value: provider.id,
            label: `${provider.displayName} (${provider.specialty.replaceAll("_", " ")})`,
          }))}
        />
        <Controller
          name="reason"
          control={form.control}
          rules={{
            required: "Choose a reason for the consultation.",
            maxLength: 240,
            validate: (value) => !!value.trim() || "Choose a reason for the consultation.",
          }}
          render={({ field }) => (
            <ReasonField
              id="visitReason"
              label="Reason for visit"
              required
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              suggestions={reasonSuggestions.visit}
              error={form.formState.errors.reason?.message}
            />
          )}
        />
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
          {form.formState.isSubmitting ? "Starting consultation…" : "Start consultation"}
        </Button>
      </form>
    </div>
  );
}
