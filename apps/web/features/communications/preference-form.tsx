"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { PhoneInput } from "@/components/application/phone-input";
import { phoneError } from "@/lib/contact-format";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useEntrySheetActions } from "@/components/application/entry-sheet";
import { FormSelect } from "@/features/patients/form-controls";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { useFinancialAction } from "@/features/billing/use-billing";
import { FinancialNotice } from "@/features/billing/controls";
import type { CommunicationSetup } from "./schema";

const schema = z.object({
  recipient: z
    .string()
    .refine((value) => !phoneError(value), "Enter a complete international phone number."),
  recipient_name: z.string().max(160),
  recipient_user_id: z.string(),
  sms_enabled: z.boolean(),
  in_app_enabled: z.boolean(),
  appointments: z.boolean(),
  follow_ups: z.boolean(),
  billing: z.boolean(),
  confirmed: z.boolean().refine((value) => value, "Confirm the recipient and their choices."),
});
type Values = z.infer<typeof schema>;
export function PreferenceForm({
  setup,
  patientId,
  branchId,
  saved,
}: {
  setup: CommunicationSetup;
  patientId: string;
  branchId: string;
  saved: () => void;
}) {
  const previous = setup.preference;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      recipient: previous?.recipient ?? "",
      recipient_name: previous?.recipient_name ?? "",
      recipient_user_id: previous?.recipient_user_id ?? "none",
      sms_enabled: previous?.sms_enabled ?? false,
      in_app_enabled: previous?.in_app_enabled ?? false,
      appointments: previous?.appointments ?? false,
      follow_ups: previous?.follow_ups ?? false,
      billing: previous?.billing ?? false,
      confirmed: false,
    },
  });
  const values = useWatch({ control: form.control });
  const action = useFinancialAction("communication");
  const sheet = useEntrySheetActions();
  useUnsavedChanges(`recipient:${branchId}:${patientId}`, form.formState.isDirty, () =>
    form.reset(),
  );
  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={form.handleSubmit(async (data) => {
        const result = await action.run("preference", {
          ...data,
          patient_id: patientId,
          branch_id: branchId,
          recipient_user_id: data.recipient_user_id === "none" ? null : data.recipient_user_id,
          expected_version: previous?.version ?? 0,
        });
        if (result) {
          form.reset(data);
          saved();
          sheet?.complete();
        }
      })}
    >
      <p className="text-sm leading-6 text-muted-foreground">
        Confirm the intended recipient directly. A phone number in the patient record does not
        establish consent. Changing these choices invalidates pending reminders.
      </p>
      <fieldset className="grid gap-5" disabled={action.busy}>
        <h3 className="font-semibold">Confirmed recipient</h3>
        <FormField
          id="recipient-name"
          label="Recipient name"
          error={form.formState.errors.recipient_name?.message}
        >
          <Input
            id="recipient-name"
            autoComplete="off"
            maxLength={160}
            {...form.register("recipient_name")}
          />
        </FormField>
        <FormField
          id="recipient-phone"
          label="Phone number"
          hint="Country code is separate. For +63, omit the leading 0."
          error={form.formState.errors.recipient?.message}
        >
          <Controller
            name="recipient"
            control={form.control}
            render={({ field }) => (
              <PhoneInput
                {...field}
                id="recipient-phone"
                onValueChange={field.onChange}
                aria-invalid={!!form.formState.errors.recipient}
                aria-describedby="recipient-phone-help"
              />
            )}
          />
        </FormField>
        <FormSelect
          id="recipient-account"
          label="Verified portal recipient"
          value={values.recipient_user_id ?? "none"}
          onChange={(value) => form.setValue("recipient_user_id", value, { shouldDirty: true })}
          options={[
            { value: "none", label: "No portal account selected" },
            ...(setup.recipients ?? []).map((item) => ({
              value: item.id,
              label: `${item.name} · ${item.relationship}`,
            })),
          ]}
        />
        <div className="grid gap-3 border-t border-border pt-5">
          <h3 className="font-semibold">Channels</h3>
          <ConsentCheck
            id="consent-sms"
            label="Recipient agrees to SMS reminders"
            checked={values.sms_enabled ?? false}
            onChange={(value) => form.setValue("sms_enabled", value, { shouldDirty: true })}
          />
          <ConsentCheck
            id="consent-in-app"
            label="Recipient agrees to private portal reminders"
            checked={values.in_app_enabled ?? false}
            onChange={(value) => form.setValue("in_app_enabled", value, { shouldDirty: true })}
          />
        </div>
        <div className="grid gap-3 border-t border-border pt-5">
          <h3 className="font-semibold">Reminder purposes</h3>
          {(
            [
              ["appointments", "Appointments"],
              ["follow_ups", "Follow-up contact"],
              ["billing", "Billing updates"],
            ] as const
          ).map(([key, label]) => (
            <ConsentCheck
              key={key}
              id={`consent-${key}`}
              label={label}
              checked={values[key] ?? false}
              onChange={(value) => form.setValue(key, value, { shouldDirty: true })}
            />
          ))}
        </div>
        <ConsentCheck
          id="recipient-confirm"
          label="I have confirmed this recipient's identity, contact details and chosen consent settings."
          checked={values.confirmed ?? false}
          onChange={(value) => form.setValue("confirmed", value, { shouldDirty: true })}
        />
        {form.formState.errors.confirmed && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.confirmed.message}
          </p>
        )}
      </fieldset>
      <FinancialNotice error={action.error} />
      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => sheet?.cancel()}
          disabled={action.busy}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={action.busy}>
          {action.busy ? "Saving consent…" : "Save recipient and consent"}
        </Button>
      </div>
    </form>
  );
}
export function ConsentCheck({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm leading-6"
    >
      <Checkbox
        id={id}
        className="mt-1"
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <span>{label}</span>
    </label>
  );
}
