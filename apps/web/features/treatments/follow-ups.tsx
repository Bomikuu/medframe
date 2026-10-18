"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { FollowUpsDocument, SaveFollowUpDocument } from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/features/patients/form-controls";
import { LoadState, failureText, dateLabel } from "@/features/patients/feedback";
import { recordPage } from "@/features/records/schema";
import { PageControls } from "@/features/records/record-filters";

export const followUpSchema = z.object({
  id: z.string(),
  plan_id: z.string().nullable(),
  instructions: z.string(),
  due_date: z.string().nullable(),
  status: z.string(),
  version: z.number(),
});
const empty = {
  id: "",
  plan_id: "",
  instructions: "",
  due_date: "",
  status: "open",
  version: 0,
  requestId: "",
};
export function FollowUps({
  patientId,
  plans = [],
}: {
  patientId: string;
  plans?: { id: string; title: string }[];
}) {
  const { organizationId, can } = useWorkspace();
  const [after, setAfter] = useState<string>();
  const remote = useRemote(FollowUpsDocument, { organizationId, patientId, after });
  const parsed = recordPage(followUpSchema).safeParse(remote.data?.followUps);
  const form = useForm({ defaultValues: { ...empty, requestId: crypto.randomUUID() } });
  const watchedForm = useWatch({ control: form.control });
  const capture = useRequestScope();
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  useUnsavedChanges(`followup:${organizationId}:${patientId}`, form.formState.isDirty, () =>
    form.reset(),
  );
  return (
    <section className="grid gap-5">
      <h2 className="text-xl font-semibold">Follow-ups</h2>
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : parsed.success ? (
        <>
          <ul className="grid gap-4">
            {parsed.data.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-4 border-b border-border py-4"
              >
                <div className="max-w-prose">
                  <p className="whitespace-pre-wrap">{item.instructions}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.due_date ? `Due ${dateLabel(item.due_date)}` : "No date set"} ·{" "}
                    {item.status} · version {item.version}
                  </p>
                </div>
                {can("treatments.write") && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={form.formState.isDirty}
                    onClick={() => {
                      form.reset({
                        ...item,
                        plan_id: item.plan_id ?? "",
                        due_date: item.due_date ?? "",
                        requestId: crypto.randomUUID(),
                      });
                      setMessage("");
                    }}
                  >
                    Edit follow-up
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {!parsed.data.items.length && (
            <p className="text-sm text-muted-foreground">
              No follow-ups recorded. Add clinician-authored instructions and an optional review
              date.
            </p>
          )}
          <PageControls after={after} next={parsed.data.end_cursor} onChange={setAfter} />
        </>
      ) : (
        <p role="alert">Follow-ups could not be read.</p>
      )}
      {can("treatments.write") && (
        <details className="rounded-lg border border-border p-5">
          <summary className="min-h-11 font-medium">Add or edit follow-up</summary>
          <form
            noValidate
            className="mt-4 grid gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              const current = capture();
              setError(null);
              try {
                await getGraphqlClient().request(SaveFollowUpDocument, {
                  organizationId,
                  patientId,
                  data: {
                    ...(values.id ? { id: values.id } : {}),
                    plan_id: values.plan_id || null,
                    instructions: values.instructions,
                    due_date: values.due_date || null,
                    status: values.status,
                  },
                  expectedVersion: values.version,
                  requestId: values.requestId,
                });
                if (current()) {
                  form.reset({ ...empty, requestId: crypto.randomUUID() });
                  setMessage("Follow-up saved.");
                  remote.reload();
                }
              } catch (failure) {
                if (current()) setError(failure);
              }
            })}
          >
            <FormField
              id="followup-instructions"
              label="Follow-up instructions"
              error={form.formState.errors.instructions?.message}
            >
              <Textarea
                className="min-h-32 resize-none"
                id="followup-instructions"
                rows={4}
                maxLength={4000}
                {...form.register("instructions", { required: "Enter follow-up instructions." })}
              />
            </FormField>
            <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
              <FormField id="followup-date" label="Review date (optional)">
                <Input id="followup-date" type="date" {...form.register("due_date")} />
              </FormField>
              <FormSelect
                id="followup-plan"
                label="Related plan"
                value={watchedForm.plan_id || "none"}
                onChange={(value) =>
                  form.setValue("plan_id", value === "none" ? "" : value, { shouldDirty: true })
                }
                options={[
                  { value: "none", label: "Independent follow-up" },
                  ...plans.map((item) => ({ value: item.id, label: item.title })),
                ]}
              />
              <FormSelect
                id="followup-status"
                label="Follow-up status"
                value={watchedForm.status ?? ""}
                onChange={(value) => form.setValue("status", value, { shouldDirty: true })}
                options={["open", "completed", "cancelled"].map((value) => ({
                  value,
                  label: value,
                }))}
              />
            </div>
            {error !== null && <p role="alert">{failureText(error)}</p>}
            {message && <p role="status">{message}</p>}
            <div className="flex gap-3">
              <Button disabled={form.formState.isSubmitting}>Save follow-up</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset({ ...empty, requestId: crypto.randomUUID() });
                  setError(null);
                }}
              >
                Clear form
              </Button>
            </div>
          </form>
        </details>
      )}
    </section>
  );
}
