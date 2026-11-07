"use client";

import { ReasonField } from "@/components/application/reason-field";
import { reasonSuggestions } from "@/lib/reason-suggestions";

import { useCallback, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEntrySheetActions } from "@/components/application/entry-sheet";
import { CalendarDays, Clock3, UserRound, Search, Video } from "lucide-react";
import {
  PatientSearchDialog,
  type PatientSuggestion,
} from "@/features/patients/patient-search-dialog";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { InstantRoomReady } from "@/features/calls/instant-room-ready";
import type { CallState } from "@/features/calls/client";
import { errorMessage, requestWithCsrf } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/application/date-input";
import { calendarDay } from "./calendar-dates";
import { PersonIdentity } from "@/components/application/person-identity";
import { DurationChoice } from "./duration-choice";
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

const valuesSchema = z
  .object({
    delivery: z.enum(["in_person", "online", "instant"]),
    doctor_mode: z.enum(["assigned", "eligible"]),
    patient_id: z.string().min(1, "Choose a patient."),
    provider_id: z.string().min(1, "Choose a provider."),
    resource_id: z.string(),
    date: z.string(),
    duration: z.string(),
    reason: z.string().max(240),
    type: z.enum(["routine", "follow_up"]),
  })
  .superRefine((values, context) => {
    if (values.delivery === "instant") return;
    if (!values.date)
      context.addIssue({ code: "custom", path: ["date"], message: "Choose a visit date." });
    const duration = Number(values.duration);
    if (!Number.isFinite(duration) || duration < 5 || duration > 240 || duration % 5 !== 0)
      context.addIssue({
        code: "custom",
        path: ["duration"],
        message: "Use 5–240 minutes in five-minute increments.",
      });
  });
type Values = z.infer<typeof valuesSchema>;

export function BookingForm({
  setup,
  reload,
  walkIn = false,
  appointment,
  close,
  complete,
  patient,
}: {
  setup: OperationsSetup;
  reload: () => void;
  walkIn?: boolean;
  appointment?: Appointment;
  close?: () => void;
  complete?: () => void;
  patient?: { id: string; name: string; reference: string };
}) {
  const { organizationId, can } = useWorkspace();
  const action = useOperationsAction();
  const sheet = useEntrySheetActions();
  const defaults: Values = {
    delivery: "in_person",
    doctor_mode: "assigned",
    patient_id: appointment?.patient_id ?? patient?.id ?? "",
    provider_id: appointment?.provider_id ?? setup.providers[0]?.id ?? "",
    resource_id: appointment?.resource_id ?? "none",
    date: appointment ? calendarDay(appointment.start, setup.timezone) : localDate(setup.timezone),
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
  const [patientSearch, setPatientSearch] = useState(false);
  const [chosenPatient, setChosenPatient] = useState<PatientSuggestion | null>(patient ?? null);
  const [instantBusy, setInstantBusy] = useState(false);
  const [instantError, setInstantError] = useState("");
  const [createdRoom, setCreatedRoom] = useState<CallState | null>(null);
  const instantReceipt = useRef({ payload: "", id: "" });
  const instantPending = useRef(false);
  const instant = !walkIn && !appointment && watched.delivery === "instant";
  const busy = action.busy || instantBusy;
  const [selected, setSelected] = useState(appointment?.start ?? "");
  const [slotError, setSlotError] = useState("");
  const duration = Number(watched.duration);
  const remote = useRemote(
    OperationSlotsDocument,
    {
      organizationId,
      data: {
        branch_id: setup.branch_id,
        ...(appointment ? { appointment_id: appointment.id } : {}),
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
        !instant &&
        !!watched.provider_id &&
        !!watched.date &&
        duration >= 5 &&
        duration <= 240 &&
        duration % 5 === 0,
    },
  );
  const parsed = slotsSchema.safeParse(remote.data?.appointmentAvailability);
  const slots = parsed.success ? parsed.data : [];
  const chosen = slots.find((row) => Date.parse(row.start) === Date.parse(selected))?.start ?? "";
  const save = form.handleSubmit(async (values) => {
    if (instant) {
      if (instantPending.current) return;
      instantPending.current = true;
      setInstantBusy(true);
      setInstantError("");
      const data = {
        organization_id: organizationId,
        branch_id: setup.branch_id,
        patient_id: values.patient_id,
        provider_id: values.provider_id,
        reason: values.reason,
      };
      const payload = JSON.stringify(data);
      if (instantReceipt.current.payload !== payload)
        instantReceipt.current = { payload, id: crypto.randomUUID() };
      try {
        const room = await requestWithCsrf<CallState>("calls/rooms", {
          action: "create_instant",
          ...data,
          request_id: instantReceipt.current.id,
        });
        form.reset(defaults);
        reload();
        setCreatedRoom(room);
      } catch (failure) {
        setInstantError(errorMessage(failure));
      } finally {
        instantPending.current = false;
        setInstantBusy(false);
      }
      return;
    }
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
          ...(!walkIn
            ? {
                start: chosen,
                reason: values.reason,
                type: values.type,
                online: values.delivery === "online",
                doctor_mode: values.doctor_mode,
              }
            : {}),
        };
    const success = await action.run(
      appointment ? "reschedule" : walkIn ? "walk_in" : "book",
      data,
      reload,
    );
    if (success) {
      form.reset(defaults);
      setSelected("");
      if (complete) complete();
      else if (close) close();
      else sheet?.complete();
    }
  });
  const missingDetails =
    !watched.patient_id ||
    !watched.provider_id ||
    (!instant &&
      (!Number.isFinite(duration) || duration < 5 || duration > 240 || duration % 5 !== 0));
  if (createdRoom) return <InstantRoomReady room={createdRoom} />;
  return (
    <form noValidate onSubmit={save} className="@container grid min-w-0 gap-6">
      {appointment && (
        <div className="grid gap-3 rounded-lg bg-muted/40 p-4 text-sm">
          <PersonIdentity
            kind="patient"
            name={appointment.patient}
            imageId={appointment.patient_portrait_id}
          />
          <PersonIdentity
            kind="provider"
            name={appointment.provider}
            imageId={appointment.provider_photo_id}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            The patient, provider and room stay assigned.{" "}
            {appointment.online_room_id
              ? "After changing the time, regenerate online room access before sharing it with the patient."
              : ""}
          </p>
        </div>
      )}
      <OperationNotice message={action.message} error={instantError || action.error} />
      {!appointment && (
        <fieldset disabled={busy} className="grid min-w-0 gap-4 border-b border-border pb-6">
          <legend className="mb-4 flex items-center gap-2 font-heading text-base font-semibold">
            <UserRound className="size-4 text-teal-ink" />
            Patient and provider
          </legend>
          <div className="grid min-w-0 gap-4 @[480px]:grid-cols-2">
            <div className="grid gap-2">
              <span className="text-sm font-medium">Patient</span>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-11 justify-start py-2 text-left whitespace-normal"
                disabled={!!patient || busy}
                onClick={() => setPatientSearch(true)}
              >
                {chosenPatient ? (
                  <>
                    <PatientAvatar
                      name={chosenPatient.name}
                      imageId={chosenPatient.portrait_id ?? undefined}
                      className="size-8"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm">{chosenPatient.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {chosenPatient.reference}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <Search aria-hidden className="size-4" />
                    Find patient
                  </>
                )}
              </Button>
              {form.formState.errors.patient_id?.message && (
                <p role="alert" className="text-xs text-destructive">
                  {form.formState.errors.patient_id.message}
                </p>
              )}
              <PatientSearchDialog
                open={patientSearch}
                onOpenChange={setPatientSearch}
                branchId={setup.branch_id}
                title="Choose a patient"
                description="Search the current branch and select the patient for this visit."
                actionLabel="Select patient"
                select={(row) => {
                  setChosenPatient(row);
                  form.setValue("patient_id", row.id, { shouldDirty: true, shouldValidate: true });
                }}
              />
            </div>
            <FormSelect
              id={`booking-provider-${walkIn}`}
              label="Provider"
              value={watched.provider_id ?? ""}
              onChange={(value) => {
                form.setValue("provider_id", value, { shouldDirty: true });
                setSelected("");
              }}
              options={setup.providers.map((row) => ({
                value: row.id,
                label: row.name,
                person: { kind: "provider" as const, name: row.name, imageId: row.photo_id },
              }))}
              error={form.formState.errors.provider_id?.message}
            />
          </div>
        </fieldset>
      )}
      <fieldset disabled={busy} className="grid min-w-0 gap-4 border-b border-border pb-6">
        <legend className="mb-4 flex items-center gap-2 font-heading text-base font-semibold">
          <Clock3 className="size-4 text-teal-ink" />
          Visit details
        </legend>
        <div className="grid min-w-0 gap-4 @[480px]:grid-cols-2">
          {!walkIn && !appointment && (
            <>
              <FormSelect
                id="booking-delivery"
                label="Appointment location"
                value={watched.delivery ?? "in_person"}
                onChange={(value) =>
                  form.setValue("delivery", value as Values["delivery"], { shouldDirty: true })
                }
                options={[
                  { value: "in_person", label: "At the clinic" },
                  { value: "online", label: "Online · scheduled video appointment" },
                  ...(can("encounters.write")
                    ? [{ value: "instant", label: "Instant consultation · no date or time" }]
                    : []),
                ]}
              />
              {watched.delivery === "online" && (
                <FormSelect
                  id="booking-doctor-mode"
                  label="Online doctor access"
                  value={watched.doctor_mode ?? "assigned"}
                  onChange={(value) =>
                    form.setValue("doctor_mode", value as Values["doctor_mode"], {
                      shouldDirty: true,
                    })
                  }
                  options={[
                    { value: "assigned", label: "Assigned doctor only" },
                    { value: "eligible", label: "First eligible clinic doctor to claim" },
                  ]}
                />
              )}
            </>
          )}
          {!walkIn && !appointment && !instant && (
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
          {!appointment && !instant && (
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
                  .map((row) => ({
                    value: row.id,
                    label: row.name,
                  })),
              ]}
            />
          )}
          {!instant && (
            <DurationChoice
              id={`booking-duration-${appointment?.id ?? walkIn}`}
              label="Visit duration"
              value={watched.duration ?? "30"}
              change={(value) => {
                form.setValue("duration", value, { shouldDirty: true, shouldValidate: true });
                setSelected("");
              }}
              error={form.formState.errors.duration?.message}
            />
          )}
        </div>
      </fieldset>
      {!walkIn && (
        <>
          {!instant && (
            <fieldset disabled={busy} className="grid min-w-0 gap-4 border-b border-border pb-6">
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
                  <DateInput
                    id={`booking-date-${appointment?.id ?? "new"}`}
                    value={watched.date ?? ""}
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
                  No available times for these details. Choose another date or ask your
                  administrator to configure the provider schedule.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {slots.length} available time{slots.length === 1 ? "" : "s"}. The clinic confirms
                  availability when you book.
                </p>
              )}
            </fieldset>
          )}
          {instant && (
            <p className="flex items-start gap-3 rounded-lg bg-teal-soft p-4 text-sm leading-6 text-teal-ink">
              <Video aria-hidden className="mt-1 size-5 shrink-0" />
              No date, time slot or duration needed. Choose your own provider profile to open this
              room now. Patient admission is required; you end the room manually.
            </p>
          )}
          <Controller
            name="reason"
            control={form.control}
            render={({ field }) => (
              <ReasonField
                id={`booking-reason-${appointment?.id ?? "new"}`}
                label={appointment ? "Reason for rescheduling" : "Operational notes (optional)"}
                hint="Do not enter diagnoses or private clinical notes here."
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                suggestions={appointment ? reasonSuggestions.reschedule : reasonSuggestions.booking}
                error={form.formState.errors.reason?.message}
              />
            )}
          />
          {!instant && (chosen || appointment) && (
            <p className="rounded-lg bg-teal-soft p-3 text-sm leading-6 text-teal-ink">
              {appointment && `Current booking: ${clock(appointment.start, setup.timezone)}. `}
              {chosen && `Selected: ${clock(chosen, setup.timezone)} for ${duration} minutes.`}
            </p>
          )}
        </>
      )}
      <div className="sticky bottom-0 z-10 -mx-5 flex flex-wrap items-center justify-end gap-3 border-t border-border bg-card px-5 py-4 sm:-mx-7 sm:px-7">
        {(close || sheet) && (
          <Button type="button" variant="outline" disabled={busy} onClick={close ?? sheet?.cancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={busy || missingDetails || (!walkIn && !instant && (!chosen || remote.loading))}
          aria-busy={busy}
        >
          {busy
            ? "Saving…"
            : appointment
              ? "Save appointment changes"
              : walkIn
                ? "Check in walk-in"
                : instant
                  ? "Create instant room"
                  : "Book appointment"}
        </Button>
      </div>
    </form>
  );
}
