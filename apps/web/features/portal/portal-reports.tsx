"use client";
import { useClinicTime } from "@/components/application/clinical-locale";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { PortalReportsDocument, SubmitPatientReportDocument } from "@/lib/graphql/portal/generated";
import { getPortalClient } from "@/lib/graphql/portal/client";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { FormSelect } from "@/features/patients/form-controls";
import { FormField } from "@/components/form-field";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadState, failureText } from "@/features/patients/feedback";
import { recordPage } from "@/features/records/schema";
import { PageControls } from "@/features/records/record-filters";
import { usePortal } from "./portal-provider";
import { reportSchema } from "./schema";
export function PortalReports() {
  const timeLabel = useClinicTime();
  const { linkId } = usePortal();
  const [after, setAfter] = useState<string>();
  const remote = useRemote(PortalReportsDocument, { linkId, after }, { client: getPortalClient });
  const parsed = recordPage(reportSchema).safeParse(remote.data?.portalReports);
  const form = useForm({
    defaultValues: { category: "history", text: "", requestId: crypto.randomUUID() },
  });
  const watchedForm = useWatch({ control: form.control });
  const capture = useRequestScope();
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  useUnsavedChanges(`portal-report:${linkId}`, form.formState.isDirty, () => form.reset());
  return (
    <section className="grid gap-6">
      <h2 className="text-xl font-semibold">My reports</h2>
      <p className="max-w-prose text-sm leading-6 text-muted-foreground">
        Share history, allergies, medication, or other information for your clinic to review. Your
        submission stays separate from confirmed clinical history. Contact your clinic directly for
        care requests.
      </p>
      <form
        noValidate
        className="grid max-w-2xl gap-4 rounded-xl border border-border bg-card p-5"
        onSubmit={form.handleSubmit(async (values) => {
          const current = capture();
          setError(null);
          setMessage("");
          try {
            await getPortalClient().request(SubmitPatientReportDocument, { linkId, ...values });
            if (current()) {
              form.reset({ category: "history", text: "", requestId: crypto.randomUUID() });
              setMessage("Report received by your clinic for review.");
              remote.reload();
            }
          } catch (failure) {
            if (current()) setError(failure);
          }
        })}
      >
        <FormSelect
          id="patient-report-category"
          label="Information type"
          value={watchedForm.category ?? ""}
          onChange={(value) => form.setValue("category", value, { shouldDirty: true })}
          options={["history", "allergy", "medication", "other"].map((value) => ({
            value,
            label: value[0].toUpperCase() + value.slice(1),
          }))}
        />
        <FormField
          id="patient-report-text"
          label="Information for your clinic"
          error={form.formState.errors.text?.message}
          hint="Up to 6,000 characters, within 12KiB for all languages."
        >
          <Textarea
            className="min-h-32 resize-none"
            id="patient-report-text"
            rows={6}
            maxLength={6000}
            {...form.register("text", {
              required: "Enter the information you want your clinic to review.",
              validate: (value) =>
                new TextEncoder().encode(value).length <= 12288 ||
                "Shorten the report to fit 12KiB.",
            })}
          />
        </FormField>
        {error !== null && <p role="alert">{failureText(error)}</p>}
        {message && <p role="status">{message}</p>}
        <Button className="justify-self-start" disabled={form.formState.isSubmitting}>
          Send report for review
        </Button>
      </form>
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : parsed.success ? (
        <>
          {!parsed.data.items.length && (
            <p className="text-sm text-muted-foreground">
              You have not sent any reports for this connection.
            </p>
          )}
          {parsed.data.items.map((item) => (
            <article key={item.id} className="border-b border-border py-4">
              <h3 className="font-medium">
                {item.category} · {item.state}
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Sent {timeLabel(item.created_at)}
              </p>
              <p className="mt-3 max-w-prose leading-7 whitespace-pre-wrap">{item.text}</p>
              <p className="mt-2 text-xs text-muted-foreground">Review receipt {item.version}</p>
            </article>
          ))}
          <PageControls after={after} next={parsed.data.end_cursor} onChange={setAfter} />
        </>
      ) : (
        <p role="alert">Your reports could not be read.</p>
      )}
    </section>
  );
}
