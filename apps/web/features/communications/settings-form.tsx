"use client";

import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useFinancialAction } from "@/features/billing/use-billing";
import { FinancialNotice } from "@/features/billing/controls";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { ConsentCheck } from "./preference-form";
import type { CommunicationSetup } from "./schema";

export function CommunicationSettings({
  setup,
  saved,
}: {
  setup: CommunicationSetup;
  saved: () => void;
}) {
  const action = useFinancialAction("communication");
  const form = useForm({
    defaultValues: {
      appointment_automatic: setup.settings.appointment_automatic,
      follow_up_automatic: setup.settings.follow_up_automatic,
    },
  });
  const values = useWatch({ control: form.control });
  useUnsavedChanges("communication-automation-settings", form.formState.isDirty, () =>
    form.reset(),
  );
  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit(async (data) => {
        const result = await action.run("settings", {
          ...data,
          expected_version: setup.settings.version,
        });
        if (result) {
          form.reset(data);
          saved();
        }
      })}
    >
      <p className="text-sm leading-6 text-muted-foreground">
        Clinic-wide settings. Only confirmed recipients who opted into that purpose/channel are
        eligible. Past trigger times are skipped.
      </p>
      <fieldset disabled={action.busy}>
        <ConsentCheck
          id="automatic-appointments"
          label="Appointment reminders 24 hours before the visit"
          checked={values.appointment_automatic ?? false}
          onChange={(value) => form.setValue("appointment_automatic", value, { shouldDirty: true })}
        />
        <ConsentCheck
          id="automatic-follow-ups"
          label={`Follow-up contact reminders at 09:00 on the due date (${setup.timezone})`}
          checked={values.follow_up_automatic ?? false}
          onChange={(value) => form.setValue("follow_up_automatic", value, { shouldDirty: true })}
        />
      </fieldset>
      <FinancialNotice error={action.error} message={action.message} />
      <Button type="submit" className="w-fit" disabled={action.busy || !form.formState.isDirty}>
        {action.busy ? "Saving settings…" : "Save reminder settings"}
      </Button>
    </form>
  );
}
