"use client";

import { AccessRequired } from "@/components/application/access-required";

import { usePatientDraft } from "./use-patient-draft";
import { useRequestScope } from "./use-request-scope";

import { ButtonLink } from "@/components/ui/button-link";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { getGraphqlClient } from "@/lib/graphql/client";
import {
  PatientRecordDocument,
  RegisterPatientDocument,
  UpdatePatientDocument,
  type PatientDetailsFragment,
} from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety, useUnsavedChanges } from "@/features/workspace/safety-provider";
import { IdentityFields } from "./identity-fields";
import { ContactFields } from "./contact-fields";
import { FormSelect } from "./form-controls";
import { patientDefaults, patientSchema, type PatientFormValues } from "./form-schema";
import { PageHeading, LoadState, failureCode, failureText } from "./feedback";

export function PatientForm({
  patient,
  embedded = false,
}: {
  patient?: PatientDetailsFragment;
  embedded?: boolean;
}) {
  const { workspace, organizationId, href, can, branchId: currentBranchId } = useWorkspace();
  const router = useRouter();
  const captureRequest = useRequestScope();
  const { clearDirty, confirm } = useSafety();
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      ...patientDefaults(patient),
      branchId: patient?.branchId ?? currentBranchId,
    },
  });
  const branchId = useWatch({ control: form.control, name: "branchId" });
  const [failure, setFailure] = useState<unknown>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const finished = useRef(false);
  useEffect(() => {
    finished.current = false;
    // React Activity reactivation starts a new visit after a completed navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompleted(false);
  }, []);
  useUnsavedChanges(
    `${organizationId}:${patient?.id ?? "new"}:demographics`,
    form.formState.isDirty,
    form.reset,
  );
  usePatientDraft(`${organizationId}:${patient?.id ?? "new"}:demographics`, form);
  const permitted = can(patient ? "patients.demographics.write" : "patients.register");
  if (!permitted)
    return (
      <AccessRequired
        title="Patient editing access required"
        description="Your current role does not permit this patient action."
      />
    );

  async function submit(values: PatientFormValues) {
    if (finished.current) return;
    const isCurrent = captureRequest();
    setFailure(null);
    try {
      const { expectedVersion, requestId, branchId: registrationBranch, ...fields } = values;
      const data = { ...fields, dateOfBirth: values.dateOfBirth || null };
      let patientId: string;
      if (patient) {
        const result = await getGraphqlClient().request(UpdatePatientDocument, {
          organizationId,
          patientId: patient.id,
          data: { ...data, expectedVersion },
        });
        patientId = result.updatePatientDemographics.id;
      } else {
        const registrationKey = requestId || crypto.randomUUID();
        form.setValue("requestId", registrationKey, { shouldDirty: true });
        const result = await getGraphqlClient().request(RegisterPatientDocument, {
          organizationId,
          data: { ...data, branchId: registrationBranch, requestId: registrationKey },
        });
        patientId = result.registerPatient.id;
      }
      if (!isCurrent()) return;
      finished.current = true;
      setCompleted(true);
      form.reset(patient ? values : { ...patientDefaults(), branchId: currentBranchId });
      clearDirty();
      toast.success("Patient details saved");
      router.push(href(`/clinic/patients/${patientId}`) + "&saved=details");
    } catch (error) {
      if (!isCurrent()) return;
      setFailure(error);
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }
  async function loadLatest() {
    const isCurrent = captureRequest();
    if (
      !patient ||
      !(await confirm({
        title: "Load the latest patient details?",
        description:
          "This will replace your unsaved entries with the saved version. Review the latest details before editing again.",
        action: "Load latest",
      }))
    )
      return;
    setRefreshing(true);
    try {
      const result = await getGraphqlClient().request(PatientRecordDocument, {
        organizationId,
        patientId: patient.id,
      });
      if (!isCurrent()) return;
      form.reset(patientDefaults(result.patientDemographics));
      setFailure(null);
    } catch (error) {
      if (!isCurrent()) return;
      setFailure(error);
    } finally {
      setRefreshing(false);
    }
  }
  if (failure && ["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED"].includes(failureCode(failure)))
    return <LoadState error={failure} retry={() => window.location.reload()} />;
  return (
    <>
      {!embedded && (
        <PageHeading
          title={patient ? "Edit patient details" : "Register patient"}
          description={
            patient
              ? patient.reference
              : "Create a patient record for this clinic. Medical history is reviewed separately by an authorized clinician."
          }
        />
      )}
      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={(event) => {
            void form.handleSubmit(submit)(event);
          }}
          className="@container grid max-w-3xl min-w-0 gap-7 rounded-xl border border-border bg-card p-5 sm:p-7"
        >
          <IdentityFields />
          {!patient && (
            <div className="max-w-xs">
              <FormSelect
                id="patientBranch"
                label="Registration branch"
                value={branchId}
                onChange={(value) => form.setValue("branchId", value, { shouldDirty: true })}
                options={workspace.branches.map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                }))}
              />
            </div>
          )}
          <ContactFields />
          {failure ? (
            <div
              ref={errorRef}
              tabIndex={-1}
              className="grid gap-3 rounded-lg border border-destructive/40 p-4"
            >
              <p role="alert" className="text-sm leading-6 text-destructive">
                {failureText(failure)}
              </p>
              {failureCode(failure) === "CONFLICT" && patient && (
                <Button type="button" variant="outline" onClick={loadLatest} disabled={refreshing}>
                  Load latest version
                </Button>
              )}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3 border-t border-border pt-6">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || refreshing || completed || !branchId}
              aria-busy={form.formState.isSubmitting}
              className="min-w-44"
            >
              {patient ? "Save patient details" : "Register patient"}
            </Button>
            <ButtonLink
              variant="outline"
              href={href(patient ? `/clinic/patients/${patient.id}` : "/clinic/patients")}
            >
              Cancel
            </ButtonLink>
            <span role="status" className="self-center text-sm text-muted-foreground">
              {form.formState.isSubmitting ? "Saving patient details…" : ""}
            </span>
          </div>
        </form>
      </FormProvider>
    </>
  );
}
