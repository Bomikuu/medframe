"use client";

import { EmptyState } from "@/components/application/empty-state";
import { PersonIdentity } from "@/components/application/person-identity";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { ButtonLink } from "@/components/ui/button-link";
import { EntrySheet } from "@/components/application/entry-sheet";
import { StatusBadge } from "@/components/application/status-badge";
import { useState } from "react";
import { useCalendarContext } from "./use-calendar-context";
import { useCursorHistory } from "@/components/application/use-cursor-history";
import { useRouter } from "next/navigation";
import { PatientSearchDialog } from "@/features/patients/patient-search-dialog";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Settings2,
  Search,
  CalendarCheck,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { AppointmentDayDialog } from "./appointment-day-dialog";
import { AppointmentMonth } from "./appointment-month";
import { ScheduleBookingContext } from "./schedule-booking-context";
import { AppointmentCalendar } from "./appointment-calendar";
import { AppointmentEditorDialog } from "./appointment-editor-dialog";
import { AppointmentDetails } from "./appointment-details";
import { dayLabel, shiftDay, weekStart, monthDays, monthLabel, shiftMonth } from "./calendar-dates";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/features/patients/form-controls";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState, PageHeading, RemoteNotice } from "@/features/patients/feedback";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety } from "@/features/workspace/safety-provider";
import { OperationAppointmentsDocument } from "@/lib/graphql/generated";
import {
  appointmentPageSchema,
  clock,
  localDate,
  type Appointment,
  type OperationsSetup,
} from "./schema";
import { DateChoice, OperationNotice, OperationSection, OperationsRefresh } from "./controls";
import { useOperationsAction, useOperationsSetup } from "./use-operations";
import { BookingForm } from "./booking-form";

export function AppointmentsPage() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { branchId, href } = useWorkspace();
  const router = useRouter();
  const remote = useOperationsSetup();
  if (!remote.setup) return <LoadState error={remote.error} retry={remote.reload} />;
  return (
    <div className="grid gap-7">
      <PageHeading
        title="Appointments"
        description="Manage scheduled visits and open instant consultations."
      >
        <Button variant="outline" onClick={() => setSearchOpen(true)}>
          <Search aria-hidden className="size-4" />
          Find patient
        </Button>
      </PageHeading>
      <PatientSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        branchId={branchId}
        select={(patient) => router.push(href(`/clinic/patients/${patient.id}`))}
      />
      <AppointmentAgenda key={remote.setup.branch_id} setup={remote.setup} />
    </div>
  );
}

function AppointmentAgenda({ setup }: { setup: OperationsSetup }) {
  const { organizationId, can, href } = useWorkspace();
  const { confirm, guard } = useSafety();
  const { date, setDate, view, setView, status, setStatus, provider, setProvider } =
    useCalendarContext(localDate(setup.timezone), setup.providers);
  const [dayDialog, setDayDialog] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const days =
    view === "month"
      ? monthDays(date)
      : Array.from({ length: view === "week" ? 7 : 1 }, (_, index) =>
          shiftDay(view === "week" ? weekStart(date) : date, index),
        );
  const firstDay = days[0];
  const [cursors, setCursors] = useCursorHistory(
    `${setup.branch_id}:${date}:${view}:${status}:${provider}`,
  );
  const after = cursors[cursors.length - 1];
  const setAfter = (value: string | null) => setCursors(value ? [...cursors, value] : [null]);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const action = useOperationsAction();
  const remote = useRemote(
    OperationAppointmentsDocument,
    {
      organizationId,
      filters: {
        branch_id: setup.branch_id,
        date: firstDay,
        date_to: days[days.length - 1],
        calendar: true,
        calendar_mode: view,
        ...(status !== "all" ? { status } : {}),
        ...(provider !== "all" ? { provider_id: provider } : {}),
      },
      after,
    },
    { refreshOnFocus: false },
  );
  const parsed = appointmentPageSchema.safeParse(remote.data?.appointments);
  const change = (callback: () => void) => {
    setAfter(null);
    setSelectedId(null);
    setDayDialog(null);
    callback();
  };
  return (
    <>
      <OperationNotice message={action.message} error={action.error} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <OperationsRefresh refresh={remote.reload} busy={remote.loading} />
        {can("appointments.manage") && (
          <EntrySheet
            title="Book an appointment"
            triggerVariant="default"
            description="Book a scheduled visit or open an instant online room."
          >
            <BookingForm setup={setup} reload={remote.reload} />
          </EntrySheet>
        )}
      </div>
      <OperationSection title="Calendar" surface={false}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous period"
              onClick={() =>
                change(() =>
                  setDate(
                    view === "month"
                      ? shiftMonth(date, -1)
                      : shiftDay(date, view === "week" ? -7 : -1),
                  ),
                )
              }
            >
              <ChevronLeft aria-hidden className="size-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => change(() => setDate(localDate(setup.timezone)))}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next period"
              onClick={() =>
                change(() =>
                  setDate(
                    view === "month"
                      ? shiftMonth(date, 1)
                      : shiftDay(date, view === "week" ? 7 : 1),
                  ),
                )
              }
            >
              <ChevronRight aria-hidden className="size-4" />
            </Button>
            <p className="ml-1 text-sm font-semibold">
              {view === "month" ? monthLabel(date) : dayLabel(firstDay)}
              {view === "week" ? ` – ${dayLabel(days[6])}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Calendar view">
            {(["month", "week", "day", "agenda"] as const).map((mode) => (
              <Button
                key={mode}
                variant={view === mode ? "default" : "outline"}
                aria-pressed={view === mode}
                onClick={() => change(() => setView(mode))}
              >
                {mode === "agenda" ? (
                  <List aria-hidden className="size-4" />
                ) : (
                  <CalendarDays aria-hidden className="size-4" />
                )}
                {mode[0].toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid max-w-3xl gap-4 sm:grid-cols-3">
          <DateChoice
            id="agenda-date"
            value={date}
            change={(value) => {
              if (value) change(() => setDate(value));
            }}
          />
          <FormSelect
            id="agenda-provider"
            label="Provider filter"
            value={provider}
            onChange={(value) => change(() => setProvider(value))}
            options={[
              { value: "all", label: "All permitted providers" },
              ...setup.providers.map((row) => ({
                value: row.id,
                label: row.name,
                person: { kind: "provider" as const, name: row.name, imageId: row.photo_id },
              })),
            ]}
          />
          <FormSelect
            id="agenda-status"
            label="Status filter"
            value={status}
            onChange={(value) => change(() => setStatus(value))}
            options={[
              { value: "all", label: "All statuses" },
              ...["booked", "checked_in", "in_service", "completed", "cancelled", "no_show"].map(
                (value) => ({ value, label: value.replaceAll("_", " ") }),
              ),
            ]}
          />
        </div>
        {!parsed.success ? (
          <LoadState error={remote.error} retry={remote.reload} />
        ) : (
          <>
            <RemoteNotice error={remote.error} retry={remote.reload} />
            <p className="text-xs leading-5 text-muted-foreground">
              Manual updates · Calendar position, view and filters stay in this link. Opening a
              booking keeps the calendar in place.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Agenda summary">
              {[
                {
                  label: "Appointments shown",
                  value: parsed.data.items.length,
                  icon: CalendarDays,
                  color: "bg-blue-50 text-blue-700",
                },
                {
                  label: "Booked",
                  icon: CalendarCheck,
                  color: "bg-violet-50 text-violet-700",
                  value: parsed.data.items.filter((row) => row.status === "booked").length,
                },
                {
                  label: "Arrived",
                  icon: UserCheck,
                  color: "bg-teal-soft text-teal-ink",
                  value: parsed.data.items.filter((row) =>
                    ["checked_in", "in_service"].includes(row.status),
                  ).length,
                },
                {
                  label: "Completed",
                  icon: CheckCircle2,
                  color: "bg-emerald-50 text-emerald-700",
                  value: parsed.data.items.filter((row) => row.status === "completed").length,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-[border-color,box-shadow] hover:border-teal-ink/30 hover:shadow-sm motion-reduce:transition-none"
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-lg ${item.color}`}
                  >
                    <item.icon aria-hidden className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {view === "month"
                ? `${setup.timezone} · Summary: up to 50 loaded bookings. Calendar day counts include all matches.`
                : `${setup.timezone} · Summary reflects the loaded bookings and current filters.`}
            </p>
            {parsed.data.calendar && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {view === "month"
                      ? "Select a day to see its schedule."
                      : "Bookings & working hours"}
                  </p>
                  <ButtonLink variant="ghost" href={href("/clinic/settings/schedules")}>
                    <Settings2 aria-hidden className="size-4" />
                    Manage availability
                  </ButtonLink>
                </div>
                {view !== "month" && (
                  <ScheduleBookingContext
                    hours={parsed.data.calendar.hours}
                    items={parsed.data.items}
                    providers={setup.providers}
                    timezone={setup.timezone}
                    select={(row) => setSelectedId(row.id)}
                    partial={parsed.data.has_next_page}
                  />
                )}
                {view === "month" && (
                  <AppointmentMonth
                    days={days}
                    month={date}
                    today={localDate(setup.timezone)}
                    timezone={setup.timezone}
                    items={parsed.data.calendar.previews}
                    counts={parsed.data.calendar.daily_counts}
                    select={(row) => setSelectedId(row.id)}
                    openDay={setDayDialog}
                  />
                )}
                {!!parsed.data.calendar.in_service.length && (
                  <div className="flex flex-wrap gap-3 rounded-lg bg-teal-50 p-4 text-sm text-teal-950">
                    <span className="font-semibold">In service now</span>
                    {parsed.data.calendar.in_service.map((ticket) => (
                      <span key={ticket.id}>
                        <PersonIdentity
                          kind="provider"
                          name={ticket.provider}
                          imageId={ticket.provider_photo_id}
                        />{" "}
                        ·{" "}
                        <PersonIdentity
                          kind="patient"
                          name={ticket.patient ?? "Patient"}
                          imageId={ticket.patient_portrait_id}
                        />{" "}
                        · #{ticket.number}
                      </span>
                    ))}
                  </div>
                )}
                {(view === "day" || view === "week") && (
                  <AppointmentCalendar
                    days={days}
                    items={parsed.data.items}
                    hours={parsed.data.calendar.hours}
                    timezone={setup.timezone}
                    today={localDate(setup.timezone)}
                    select={(row) => setSelectedId(row.id)}
                  />
                )}
              </>
            )}
            {view === "agenda" && (
              <div className="grid gap-3">
                {!parsed.data.items.length && (
                  <EmptyState
                    illustration="empty-appointments"
                    title="No appointments for these dates"
                    description="Try another date or filter, book a visit, or check in a walk-in from Queue."
                  />
                )}
                {parsed.data.items.map((row) => (
                  <article
                    key={row.id}
                    className="grid min-w-0 gap-4 rounded-xl border border-border bg-card p-5 xl:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0">
                      <div className="mb-3 flex items-center gap-3">
                        <PatientAvatar
                          name={row.patient ?? "Patient"}
                          imageId={row.patient_portrait_id ?? undefined}
                          className="size-12"
                        />
                        <div>
                          <p className="text-sm font-semibold tabular-nums">
                            {row.online_timing_mode === "instant"
                              ? `Instant · created ${clock(row.start, setup.timezone)}`
                              : `${clock(row.start, setup.timezone)} – ${clock(row.end, setup.timezone)}`}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{row.branch}</p>
                        </div>
                      </div>
                      <h3 className="font-semibold wrap-anywhere">
                        {row.patient}{" "}
                        <span className="font-normal text-muted-foreground">{row.reference}</span>
                      </h3>
                      <p className="mt-2 text-sm">
                        <PersonIdentity
                          kind="provider"
                          name={row.provider}
                          imageId={row.provider_photo_id}
                        />{" "}
                        · {row.resource ?? "No room reserved"}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        <StatusBadge value={row.status} /> · {row.type.replaceAll("_", " ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" onClick={() => setSelectedId(row.id)}>
                        View details
                      </Button>
                      {row.patient_id && <AppointmentPatientLink patientId={row.patient_id} />}
                      {row.status === "booked" && row.online_timing_mode !== "instant" && (
                        <>
                          <Button
                            type="button"
                            disabled={action.busy}
                            onClick={() =>
                              void action.run(
                                "check_in",
                                { id: row.id, expected_version: row.version },
                                remote.reload,
                              )
                            }
                          >
                            Check in patient
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void guard(() => setEditing(row))}
                          >
                            Edit appointment
                          </Button>
                          {new Date(row.start) <= new Date() && (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={action.busy}
                              onClick={async () => {
                                if (
                                  await confirm({
                                    title: "Mark appointment no-show?",
                                    description:
                                      "The reserved time will be released. Clinical records remain preserved.",
                                    action: "Mark no-show",
                                  })
                                )
                                  await action.run(
                                    "appointment_action",
                                    {
                                      id: row.id,
                                      expected_version: row.version,
                                      target: "no_show",
                                      reason: "Patient did not attend",
                                    },
                                    remote.reload,
                                  );
                              }}
                            >
                              Mark no-show
                            </Button>
                          )}
                        </>
                      )}
                      {["booked", "checked_in"].includes(row.status) && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={action.busy}
                          onClick={async () => {
                            if (
                              await confirm({
                                title: "Cancel this appointment?",
                                description:
                                  "Its reservation and any waiting ticket will be released.",
                                action: "Cancel appointment",
                              })
                            )
                              await action.run(
                                "appointment_action",
                                {
                                  id: row.id,
                                  expected_version: row.version,
                                  target: "cancelled",
                                  reason: "Staff requested cancellation",
                                },
                                remote.reload,
                              );
                          }}
                        >
                          Cancel appointment
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
            {view !== "month" && parsed.data.has_next_page && (
              <p role="status" className="text-sm text-muted-foreground">
                This is a partial calendar: up to 50 bookings are shown on this page. Use a provider
                filter or More bookings to view the rest. Empty space does not guarantee an
                available slot.
              </p>
            )}
            <div className="flex gap-3">
              {view !== "month" && cursors.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCursors(cursors.slice(0, -1))}
                >
                  Previous bookings
                </Button>
              )}
              {view !== "month" && after && (
                <Button type="button" variant="outline" onClick={() => setAfter(null)}>
                  Latest bookings
                </Button>
              )}
              {view !== "month" && parsed.data.has_next_page && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAfter(parsed.data.end_cursor)}
                >
                  More bookings
                </Button>
              )}
            </div>
          </>
        )}
      </OperationSection>
      {dayDialog && (
        <AppointmentDayDialog
          key={`${setup.branch_id}:${dayDialog}:${provider}:${status}`}
          day={dayDialog}
          count={
            parsed.success
              ? parsed.data.calendar?.daily_counts.find((item) => item.date === dayDialog)?.count
              : undefined
          }
          setup={setup}
          provider={provider}
          status={status}
          close={() => setDayDialog(null)}
          edit={(row) => {
            setDayDialog(null);
            setEditing(row);
          }}
        />
      )}
      {selectedId &&
        parsed.success &&
        (() => {
          const row = [...parsed.data.items, ...(parsed.data.calendar?.previews ?? [])].find(
            (item) => item.id === selectedId,
          );
          return row ? (
            <AppointmentDetails
              row={row}
              current={parsed.data.calendar?.in_service ?? []}
              setup={setup}
              reload={remote.reload}
              close={() => setSelectedId(null)}
              reschedule={() => {
                setSelectedId(null);
                setEditing(row);
              }}
              stale={remote.loading || !!remote.error}
            />
          ) : null;
        })()}
      {editing && (
        <AppointmentEditorDialog close={() => void guard(() => setEditing(null))}>
          <BookingForm
            key={`${editing.id}:${editing.version}`}
            setup={setup}
            appointment={editing}
            reload={remote.reload}
            complete={() => setEditing(null)}
            close={() => void guard(() => setEditing(null))}
          />
        </AppointmentEditorDialog>
      )}
    </>
  );
}

function AppointmentPatientLink({ patientId }: { patientId: string }) {
  const { href, can } = useWorkspace();
  return can("patients.demographics.read") ? (
    <ButtonLink variant="ghost" href={href(`/clinic/patients/${patientId}`)}>
      Patient record
    </ButtonLink>
  ) : null;
}
