"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { useEntrySheetActions } from "@/components/application/entry-sheet";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { useFinancialAction } from "@/features/billing/use-billing";
import { FinancialNotice } from "@/features/billing/controls";
import type { CommunicationSetup } from "./schema";

const schema = z.object({
  source: z.string().min(1, "Choose a source."),
  channel: z.enum(["sms", "in_app"]),
  due: z.string().min(1, "Choose a future time."),
});
type Values = z.infer<typeof schema>;
export function ReminderForm({
  setup,
  branchId,
  patientId,
  saved,
}: {
  setup: CommunicationSetup;
  branchId: string;
  patientId: string;
  saved: () => void;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { source: "", channel: "sms", due: "" },
  });
  const values = useWatch({ control: form.control });
  const action = useFinancialAction("communication");
  const sheet = useEntrySheetActions();
  const selected = setup.sources?.find((source) => `${source.kind}:${source.id}` === values.source);
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  useUnsavedChanges(`reminder:${branchId}:${patientId}`, form.formState.isDirty, () =>
    form.reset(),
  );
  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={form.handleSubmit(async (data) => {
        const source = setup.sources?.find(
          (source) => `${source.kind}:${source.id}` === data.source,
        );
        const due = new Date(data.due);
        if (!source || Number.isNaN(due.getTime()) || due <= new Date()) {
          form.setError("due", { message: "Choose a valid future time." });
          return;
        }
        const result = await action.run("schedule", {
          branch_id: branchId,
          patient_id: patientId,
          source_kind: source.kind,
          source_id: source.id,
          channel: data.channel,
          due_at: due.toISOString(),
        });
        if (result) {
          form.reset();
          saved();
          sheet?.complete();
        }
      })}
    >
      <fieldset disabled={action.busy} className="grid gap-5">
        <FormSelect
          id="reminder-source"
          label="Reminder source"
          value={values.source ?? ""}
          error={form.formState.errors.source?.message}
          onChange={(value) => form.setValue("source", value, { shouldDirty: true })}
          options={(setup.sources ?? []).map((source) => ({
            value: `${source.kind}:${source.id}`,
            label: source.label,
          }))}
        />
        {!setup.sources?.length && (
          <p className="text-sm text-muted-foreground">
            No eligible appointments, follow-ups or issued invoices are available. Add the source
            record first.
          </p>
        )}
        <FormSelect
          id="reminder-channel"
          label="Channel"
          value={values.channel ?? "sms"}
          onChange={(value) =>
            form.setValue("channel", value as Values["channel"], { shouldDirty: true })
          }
          options={[
            {
              value: "sms",
              label: setup.transport === "preview" ? "SMS preview — not sent" : "SMS",
            },
            { value: "in_app", label: "Private patient portal" },
          ]}
        />
        <FormField
          id="reminder-time"
          label="Send at (device time)"
          error={form.formState.errors.due?.message}
        >
          <Input id="reminder-time" type="datetime-local" {...form.register("due")} />
        </FormField>
        <p className="text-xs leading-6 text-muted-foreground">
          Input timezone: {deviceZone}. The delivery queue displays {setup.timezone}. Consent and
          source state are checked again before sending.
        </p>
        <section className="grid gap-3 rounded-xl bg-teal-soft p-5 text-sm text-teal-ink">
          <h3 className="font-semibold">Message preview</h3>
          <p className="leading-6">
            {selected?.message ?? "Choose a source to preview the exact message."}
          </p>
          <p className="text-xs">
            {values.channel === "sms" && setup.transport === "preview"
              ? "Preview transport is active. No external SMS will be sent."
              : "Only confirmed, opted-in recipients are eligible."}
          </p>
        </section>
      </fieldset>
      <FinancialNotice error={action.error} />
      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={action.busy}
          onClick={() => sheet?.cancel()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={action.busy || !setup.sources?.length}>
          {action.busy ? "Scheduling…" : "Schedule reminder"}
        </Button>
      </div>
    </form>
  );
}
