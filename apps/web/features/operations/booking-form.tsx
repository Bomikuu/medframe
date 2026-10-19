"use client";

import { useCallback, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEntrySheetActions } from "@/components/application/entry-sheet";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Clock3, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { OperationSlotsDocument } from "@/lib/graphql/generated";
import { failureText } from "@/features/patients/feedback";
import { clock, localDate, slotsSchema, type Appointment, type OperationsSetup } from "./schema";
import { OperationNotice } from "./controls";
import { useOperationsAction } from "./use-operations";

const valuesSchema = z.object({
  patient_id: z.string().min(1, "Choose a patient."),
  provider_id: z.string().min(1, "Choose a provider."),
  resource_id: z.string(),
  date: z.string().min(1, "Choose a visit date."),
  duration: z
    .string()
    .refine(
      (value) => Number(value) >= 5 && Number(value) <= 240 && Number(value) % 5 === 0,
      "Use 5–240 minutes in five-minute increments.",
    ),
  reason: z.string().max(240),
  type: z.enum(["routine", "follow_up"]),
});
type Values = z.infer<typeof valuesSchema>;

export function BookingForm({
  setup,
  reload,
  walkIn = false,
  appointment,
  close,
}: {
  setup: OperationsSetup;
  reload: () => void;
  walkIn?: boolean;
  appointment?: Appointment;
  close?: () => void;
}) {
  const { organizationId } = useWorkspace();
  const action = useOperationsAction();
  const sheet = useEntrySheetActions();
  const defaults: Values = {
    patient_id: appointment?.patient_id ?? setup.patients[0]?.id ?? "",
    provider_id: appointment?.provider_id ?? setup.providers[0]?.id ?? "",
    resource_id: appointment?.resource_id ?? "none",
    date: localDate(setup.timezone),
    duration: appointment
      ? String((Date.parse(appointment.end) - Date.parse(appointment.start)) / 60000)
      : String(
          setup.schedules.find((row) => row.active && row.provider_id === setup.providers[0]?.id)
            ?.duration ?? 30,
        ),
    reason: "",
    type: "routine",
  };
  const form = useForm<Values>({ resolver: zodResolver(valuesSchema), defaultValues: defaults });
  const discard = useCallback(() => form.reset(), [form]);
  useUnsavedChanges(
    `operations-booking:${setup.branch_id}:${appointment?.id ?? (walkIn ? "walk-in" : "new")}`,
    form.formState.isDirty,
    discard,
  );
  const watched = useWatch({ control: form.control, defaultValue: defaults });
  const [selected, setSelected] = useState("");
  const [slotError, setSlotError] = useState("");
  const duration = Number(watched.duration);
  const remote = useRemote(
    OperationSlotsDocument,
    {
      organizationId,
      data: {
        branch_id: setup.branch_id,
        provider_id: watched.provider_id,
        resource_id: watched.resource_id === "none" ? null : watched.resource_id,
        date_from: watched.date,
        date_to: watched.date,
        duration,
      },
    },
    {
      enabled:
        !walkIn &&
        !!watched.provider_id &&
        !!watched.date &&
        duration >= 5 &&
        duration <= 240 &&
        duration % 5 === 0,
    },
  );
  const parsed = slotsSchema.safeParse(remote.data?.appointmentAvailability);
  const slots = parsed.success ? parsed.data : [];
  const chosen = slots.some((row) => row.start === selected) ? selected : "";
  const save = form.handleSubmit(async (values) => {
    if (!walkIn && !chosen) {
      setSlotError("Choose an available appointment time.");
      return;
    }
    setSlotError("");
    const data = appointment
      ? {
          id: appointment.id,
          expected_version: appointment.version,
          start: chosen,
          duration,
          reason: values.reason || "Staff requested reschedule",
        }
      : {
          branch_id: setup.branch_id,
          patient_id: values.patient_id,
          provider_id: values.provider_id,
          resource_id: values.resource_id === "none" ? null : values.resource_id,
          duration,
          ...(!walkIn ? { start: chosen, reason: values.reason, type: values.type } : {}),
        };
    const success = await action.run(
      appointment ? "reschedule" : walkIn ? "walk_in" : "book",
      data,
      reload,
    );
    if (success) {
      form.reset(defaults);
      setSelected("");
      if (close) close();
      else sheet?.complete();
    }
  });
  const missingDetails =
    !watched.patient_id ||
    !watched.provider_id ||
    !Number.isFinite(duration) ||
    duration < 5 ||
    duration > 240 ||
    duration % 5 !== 0;
  return (
    <form noValidate onSubmit={save} className="@container grid min-w-0 gap-6">
      <OperationNotice message={action.message} error={action.error} />
      {!appointment && (
        <fieldset disabled={action.busy} className="grid min-w-0 gap-4 border-b border-border pb-6">
          <legend className="mb-4 flex items-center gap-2 font-heading text-base font-semibold">
            <UserRound className="size-4 text-teal-ink" />
            Patient and provider
          </legend>
          <div className="grid min-w-0 gap-4 @[480px]:grid-cols-2">
            <FormSelect
              id={`booking-patient-${walkIn}`}
              label="Patient"
              value={watched.patient_id ?? ""}
              onChange={(value) => form.setValue("patient_id", value, { shouldDirty: true })}
              options={setup.patients.map((row) => ({
                value: row.id,
                label: `${row.name} · ${row.reference}`,
              }))}
              error={form.formState.errors.patient_id?.message}
            />
            <FormSelect
              id={`booking-provider-${walkIn}`}
              label="Provider"
              value={watched.provider_id ?? ""}
              onChange={(value) => {
                form.setValue("provider_id", value, { shouldDirty: true });
                setSelected("");
              }}
              options={setup.providers.map((row) => ({ value: row.id, label: row.name }))}
              error={form.formState.errors.provider_id?.message}
            />
          </div>
        </fieldset>
      )}
      <fieldset disabled={action.busy} className="grid min-w-0 gap-4 border-b border-border pb-6">
        <legend className="mb-4 flex items-center gap-2 font-heading text-base font-semibold">
          <Clock3 className="size-4 text-teal-ink" />
          Visit details
        </legend>
        <div className="grid min-w-0 gap-4 @[480px]:grid-cols-2">
          {!walkIn && !appointment && (
            <FormSelect
              id="booking-type"
              label="Visit type"
              value={watched.type ?? "routine"}
              onChange={(value) =>
                form.setValue("type", value as Values["type"], { shouldDirty: true })
              }
              options={[
                { value: "routine", label: "Routine visit" },
                { value: "follow_up", label: "Follow-up visit" },
              ]}
            />
          )}
          {!appointment && (
            <FormSelect
              id={`booking-resource-${walkIn}`}
              label="Room or chair"
              value={watched.resource_id ?? "none"}
              onChange={(value) => {
                form.setValue("resource_id", value, { shouldDirty: true });
                setSelected("");
              }}
              options={[
                { value: "none", label: "No resource needed" },
                ...setup.resources
                  .filter((row) => row.active)
                  .map((row) => ({ value: row.id, label: row.name })),
              ]}
            />
          )}
          <FormField
            id={`booking-duration-${appointment?.id ?? walkIn}`}
            label="Duration (minutes)"
            error={form.formState.errors.duration?.message}
            hint="5–240 minutes, in five-minute increments."
          >
            <Input
              id={`booking-duration-${appointment?.id ?? walkIn}`}
              type="number"
              min={5}
              max={240}
              step={5}
              aria-invalid={!!form.formState.errors.duration}
              aria-describedby={`booking-duration-${appointment?.id ?? walkIn}-help`}
              {...form.register("duration", { onChange: () => setSelected("") })}
            />
          </FormField>
        </div>
      </fieldset>
      {!walkIn && (
        <>
          <fieldset
            disabled={action.busy}
            className="grid min-w-0 gap-4 border-b border-border pb-6"
          >
            <legend className="mb-3 flex items-center gap-2 font-heading text-base font-semibold">
              <CalendarDays className="size-4 text-teal-ink" />
              Schedule
            </legend>
            <p className="text-xs text-muted-foreground">
              All times are shown in {setup.timezone}.
            </p>
            <div className="grid min-w-0 gap-4 @[480px]:grid-cols-2">
              <FormField
                id={`booking-date-${appointment?.id ?? "new"}`}
                label="Visit date"
                error={form.formState.errors.date?.message}
              >
                <Input
                  id={`booking-date-${appointment?.id ?? "new"}`}
                  type="date"
                  aria-invalid={!!form.formState.errors.date}
                  {...form.register("date", { onChange: () => setSelected("") })}
                />
              </FormField>
              <FormSelect
                id={`booking-slot-${appointment?.id ?? "new"}`}
                label="Available time"
                value={chosen}
                disabled={!slots.length || remote.loading}
                onChange={(value) => {
                  setSelected(value);
                  setSlotError("");
                }}
                options={slots.map((row) => ({
                  value: row.start,
                  label: clock(row.start, setup.timezone),
                }))}
                error={slotError}
              />
            </div>
            {remote.loading ? (
              <p role="status" className="text-sm text-muted-foreground">
                Checking available times…
              </p>
            ) : remote.error ? (
              <p role="alert" className="text-sm text-destructive">
                {failureText(remote.error)}
              </p>
            ) : !slots.length ? (
              <p className="rounded-lg bg-warning-soft p-3 text-sm leading-6 text-warning">
                No available times for these details. Choose another date or ask your administrator
                to configure the provider schedule.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {slots.length} available time{slots.length === 1 ? "" : "s"}. The clinic confirms
                availability when you book.
              </p>
            )}
          </fieldset>
          <FormField
            id={`booking-reason-${appointment?.id ?? "new"}`}
            label={appointment ? "Reason for rescheduling" : "Operational notes (optional)"}
            hint="Do not enter diagnoses or private clinical notes here."
          >
            <Textarea
              id={`booking-reason-${appointment?.id ?? "new"}`}
              rows={3}
              maxLength={240}
              {...form.register("reason")}
            />
          </FormField>
          {(chosen || appointment) && (
            <p className="rounded-lg bg-teal-soft p-3 text-sm leading-6 text-teal-ink">
              {appointment && `Current booking: ${clock(appointment.start, setup.timezone)}. `}
              {chosen && `Selected: ${clock(chosen, setup.timezone)} for ${duration} minutes.`}
            </p>
          )}
        </>
      )}
      <div className="sticky bottom-0 z-10 -mx-5 flex flex-wrap items-center justify-end gap-3 border-t border-border bg-card px-5 py-4 sm:-mx-7 sm:px-7">
        {(close || sheet) && (
          <Button
            type="button"
            variant="outline"
            disabled={action.busy}
            onClick={close ?? sheet?.cancel}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={action.busy || missingDetails || (!walkIn && (!chosen || remote.loading))}
          aria-busy={action.busy}
        >
          {action.busy
            ? "Saving…"
            : appointment
              ? "Confirm reschedule"
              : walkIn
                ? "Check in walk-in"
                : "Book appointment"}
        </Button>
      </div>
    </form>
  );
}
