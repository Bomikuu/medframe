"use client";

import { ReasonField } from "@/components/application/reason-field";
import { reasonSuggestions } from "@/lib/reason-suggestions";

import { usePatientRecordReadOnly } from "@/features/patients/profile/patient-record-browse";

import { usePatientDraft } from "./use-patient-draft";
import { useRequestScope } from "./use-request-scope";

import { useRef, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getGraphqlClient } from "@/lib/graphql/client";
import {
  ClinicalRecordDocument,
  SaveHistoryDocument,
  type ClinicalDetailsFragment,
} from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety, useUnsavedChanges } from "@/features/workspace/safety-provider";
import { useRemote } from "./use-remote";
import { clinicalDefaults, clinicalSchema, type ClinicalValues } from "./clinical-schema";
import { ClinicalListFields } from "./clinical-list-fields";
import { ClinicalSummary } from "./clinical-summary";
import { LoadState, RemoteNotice, failureCode, failureText } from "./feedback";

export function ClinicalHistorySection({ patientId }: { patientId: string }) {
  const { organizationId, can } = useWorkspace();
  const readOnly = usePatientRecordReadOnly();
  const { data, error, reload } = useRemote(ClinicalRecordDocument, { organizationId, patientId });
  if (!data) return <LoadState error={error} retry={reload} />;
  if (readOnly || !can("patients.clinical.write"))
    return (
      <section className="grid gap-5 border-t border-border pt-8">
        <h2 className="text-xl font-semibold">Medical history</h2>
        <ClinicalSummary revision={data.patientClinicalHistory ?? null} />
      </section>
    );
  return (
    <div>
      <RemoteNotice error={error} retry={reload} />
      <ClinicalHistoryForm patientId={patientId} initial={data.patientClinicalHistory ?? null} />
    </div>
  );
}

function ClinicalHistoryForm({
  patientId,
  initial,
}: {
  patientId: string;
  initial: ClinicalDetailsFragment | null;
}) {
  const { organizationId } = useWorkspace();
  const { confirm } = useSafety();
  const captureRequest = useRequestScope();
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const form = useForm<ClinicalValues>({
    resolver: zodResolver(clinicalSchema),
    defaultValues: clinicalDefaults(initial),
  });
  useUnsavedChanges(`${organizationId}:${patientId}:clinical`, form.formState.isDirty, form.reset);
  usePatientDraft(`${organizationId}:${patientId}:clinical`, form);
  async function save(values: ClinicalValues) {
    const isCurrent = captureRequest();
    setError(null);
    setMessage("");
    try {
      const result = await getGraphqlClient().request(SaveHistoryDocument, {
        organizationId,
        patientId,
        data: values,
      });
      if (!isCurrent()) return;
      const revision = result.savePatientClinicalHistory;
      setSaved(revision);
      form.reset(clinicalDefaults(revision));
      setMessage(`Medical history saved as version ${revision.version}.`);
    } catch (failure) {
      if (!isCurrent()) return;
      setError(failure);
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }
  async function loadLatest() {
    const isCurrent = captureRequest();
    if (
      !(await confirm({
        title: "Load the latest medical history?",
        description:
          "Your unsaved entries will be replaced by the saved version. Review the latest history before editing again.",
        action: "Load latest",
      }))
    )
      return;
    setRefreshing(true);
    try {
      const result = await getGraphqlClient().request(ClinicalRecordDocument, {
        organizationId,
        patientId,
      });
      if (!isCurrent()) return;
      setSaved(result.patientClinicalHistory ?? null);
      form.reset(clinicalDefaults(result.patientClinicalHistory ?? null));
      setError(null);
      setMessage("Latest saved history loaded.");
    } catch (failure) {
      if (!isCurrent()) return;
      setError(failure);
    } finally {
      setRefreshing(false);
    }
  }
  if (error && ["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED"].includes(failureCode(error)))
    return <LoadState error={error} retry={() => window.location.reload()} />;
  return (
    <section className="grid gap-6 border-t border-border pt-8">
      <div>
        <h2 className="text-xl font-semibold">Medical history</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Record reviewed information. Each save preserves an attributed version.
        </p>
      </div>
      <ClinicalSummary revision={saved} />
      <details className="group rounded-xl border border-border bg-card p-5 sm:p-6">
        <summary className="font-medium text-primary hover:underline">
          Review and update medical history
        </summary>
        <FormProvider {...form}>
          <form
            noValidate
            onSubmit={(event) => {
              void form.handleSubmit(save)(event);
            }}
            className="mt-7 grid gap-8"
          >
            {(
              [
                ["medicalHistory", "Medical history"],
                ["conditions", "Relevant conditions"],
                ["pastProcedures", "Past procedures"],
              ] as const
            ).map(([name, label]) => (
              <FormField
                key={name}
                id={name}
                label={label}
                error={form.formState.errors[name]?.message}
              >
                <Textarea
                  className="resize-none"
                  id={name}
                  maxLength={2000}
                  aria-invalid={!!form.formState.errors[name]}
                  aria-describedby={form.formState.errors[name] ? `${name}-help` : undefined}
                  {...form.register(name)}
                />
              </FormField>
            ))}
            <ClinicalListFields />
            <Controller
              name="reason"
              control={form.control}
              render={({ field }) => (
                <ReasonField
                  id="revisionReason"
                  label="Reason for this update (optional)"
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  suggestions={reasonSuggestions.history}
                  error={form.formState.errors.reason?.message}
                />
              )}
            />
            {error ? (
              <div
                ref={errorRef}
                tabIndex={-1}
                className="grid gap-3 rounded-lg border border-destructive/40 p-4"
              >
                <p role="alert" className="text-sm leading-6 text-destructive">
                  {failureText(error)}
                </p>
                {failureCode(error) === "CONFLICT" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadLatest}
                    disabled={refreshing}
                  >
                    Load latest version
                  </Button>
                )}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-4">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || refreshing}
                aria-busy={form.formState.isSubmitting}
                className="min-w-44"
              >
                Save medical history
              </Button>
              <p role="status" className="text-sm text-muted-foreground">
                {form.formState.isSubmitting ? "Saving medical history…" : message}
              </p>
            </div>
          </form>
        </FormProvider>
      </details>
    </section>
  );
}
