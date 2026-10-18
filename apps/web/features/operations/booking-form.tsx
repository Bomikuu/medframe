"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  date: z.string().min(1),
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
  const defaults: Values = {
    patient_id: appointment?.patient_id ?? setup.patients[0]?.id ?? "",
    provider_id: appointment?.provider_id ?? setup.providers[0]?.id ?? "",
    resource_id: appointment?.resource_id ?? "none",
    date: localDate(setup.timezone),
    duration: appointment
      ? String((Date.parse(appointment.end) - Date.parse(appointment.start)) / 60000)
      : String(setup.schedules.find(row => row.active && row.provider_id === setup.providers[0]?.id)?.duration ?? 30),
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
  const watched = form.watch();
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
      close?.();
    }
  });
  return (
    <form noValidate onSubmit={save} className="grid gap-5">
      <OperationNotice message={action.message} error={action.error} />
      <fieldset disabled={action.busy} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-3 font-medium">
          {appointment
            ? `Reschedule ${appointment.patient ?? "appointment"}`
            : walkIn
              ? "Walk-in arrival"
              : "Visit details"}
        </legend>
        {!appointment && (
          <>
            <FormSelect
              id={`booking-patient-${walkIn}`}
              label="Patient"
              value={watched.patient_id}
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
              value={watched.provider_id}
              onChange={(value) => form.setValue("provider_id", value, { shouldDirty: true })}
              options={setup.providers.map((row) => ({ value: row.id, label: row.name }))}
              error={form.formState.errors.provider_id?.message}
            />
            <FormSelect
              id={`booking-resource-${walkIn}`}
              label="Room or chair"
              value={watched.resource_id}
              onChange={(value) => form.setValue("resource_id", value, { shouldDirty: true })}
              options={[
                { value: "none", label: "No resource needed" },
                ...setup.resources
                  .filter((row) => row.active)
                  .map((row) => ({ value: row.id, label: row.name })),
              ]}
            />
          </>
        )}
        {!walkIn && (
          <FormField
            id={`booking-date-${appointment?.id ?? "new"}`}
            label={`Visit date (${setup.timezone})`}
          >
            <Input
              id={`booking-date-${appointment?.id ?? "new"}`}
              type="date"
              {...form.register("date")}
            />
          </FormField>
        )}
        <FormField
          id={`booking-duration-${appointment?.id ?? walkIn}`}
          label="Duration in minutes"
          error={form.formState.errors.duration?.message}
        >
          <Input
            id={`booking-duration-${appointment?.id ?? walkIn}`}
            type="number"
            min={5}
            max={240}
            step={5}
            {...form.register("duration")}
            aria-invalid={!!form.formState.errors.duration}
          />
        </FormField>
        {!walkIn && !appointment && (
          <FormSelect
            id="booking-type"
            label="Visit type"
            value={watched.type}
            onChange={(value) =>
              form.setValue("type", value as Values["type"], { shouldDirty: true })
            }
            options={[
              { value: "routine", label: "Routine visit" },
              { value: "follow_up", label: "Follow-up visit" },
            ]}
          />
        )}
      </fieldset>
      {!walkIn && (
        <>
          <FormSelect
            id={`booking-slot-${appointment?.id ?? "new"}`}
            label="Available time"
            value={chosen}
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
          {remote.loading ? (
            <p role="status" className="text-sm text-muted-foreground">
              Checking available times…
            </p>
          ) : remote.error ? (
            <p role="alert" className="text-sm text-destructive">
              {failureText(remote.error)}
            </p>
          ) : (
            !slots.length && (
              <p className="text-sm text-muted-foreground">
                No available times for these details. Choose another date or ask your administrator
                to configure the provider schedule.
              </p>
            )
          )}
          <FormField
            id={`booking-reason-${appointment?.id ?? "new"}`}
            label={appointment ? "Reason for rescheduling" : "Operational reason (optional)"}
            hint="Do not enter diagnoses or private clinical notes here."
          >
            <Input
              id={`booking-reason-${appointment?.id ?? "new"}`}
              maxLength={240}
              {...form.register("reason")}
            />
          </FormField>
          <p className="text-sm text-muted-foreground">
            {appointment && `Current booking: ${clock(appointment.start, setup.timezone)}. `}
            {chosen && `Selected: ${clock(chosen, setup.timezone)} for ${duration} minutes. `}The
            server confirms availability when you save.
          </p>
        </>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={
            action.busy || !setup.providers.length || (!appointment && !setup.patients.length)
          }
        >
          {action.busy
            ? "Saving…"
            : appointment
              ? "Confirm reschedule"
              : walkIn
                ? "Check in walk-in"
                : "Book appointment"}
        </Button>
        {close && (
          <Button type="button" variant="outline" disabled={action.busy} onClick={close}>
            Close form
          </Button>
        )}
      </div>
    </form>
  );
}
