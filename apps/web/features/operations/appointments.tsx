"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
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
import {
  BranchChoice,
  DateChoice,
  OperationNotice,
  OperationSection,
  OperationsLiveStatus,
} from "./controls";
import { useOperationsAction, useOperationsLive, useOperationsSetup } from "./use-operations";
import { BookingForm } from "./booking-form";

export function AppointmentsPage() {
  const [branch, setBranch] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const remote = useOperationsSetup(branch, query);
  const { guard } = useSafety();
  if (!remote.setup) return <LoadState error={remote.error} retry={remote.reload} />;
  return (
    <div className="grid gap-7">
      <PageHeading
        title="Appointments"
        description="Manage availability, bookings and arrivals. Consultations remain separate clinical records."
      />
      <BranchChoice setup={remote.setup} change={(value) => void guard(() => setBranch(value))} />
      <form
        noValidate
        className="flex max-w-xl flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(search);
        }}
      >
        <FormField id="operations-patient-search" label="Find patient for booking">
          <Input
            id="operations-patient-search"
            type="search"
            maxLength={160}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </FormField>
        <Button type="submit" variant="outline">
          Find patient
        </Button>
      </form>
      <AppointmentAgenda key={remote.setup.branch_id} setup={remote.setup} />
    </div>
  );
}

function AppointmentAgenda({ setup }: { setup: OperationsSetup }) {
  const { organizationId, can } = useWorkspace();
  const { confirm, guard } = useSafety();
  const [date, setDate] = useState(localDate(setup.timezone));
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");
  const [after, setAfter] = useState<string | null>(null);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const action = useOperationsAction();
  const remote = useRemote(OperationAppointmentsDocument, {
    organizationId,
    filters: {
      branch_id: setup.branch_id,
      date,
      ...(status !== "all" ? { status } : {}),
      ...(provider !== "all" ? { provider_id: provider } : {}),
    },
    after,
  });
  const connected = useOperationsLive(
    { organization: organizationId, branch: setup.branch_id },
    remote.reload,
  );
  const parsed = appointmentPageSchema.safeParse(remote.data?.appointments);
  const change = (callback: () => void) => {
    setAfter(null);
    callback();
  };
  return (
    <>
      <OperationsLiveStatus connected={connected} />
      <OperationNotice message={action.message} error={action.error} />
      {can("appointments.manage") && (
        <details className="rounded-lg border border-border p-5">
          <summary className="min-h-11 cursor-pointer font-medium">Book an appointment</summary>
          <div className="pt-5">
            <BookingForm setup={setup} reload={remote.reload} />
          </div>
        </details>
      )}
      <OperationSection title="Daily agenda">
        <div className="grid max-w-3xl gap-4 sm:grid-cols-3">
          <DateChoice
            id="agenda-date"
            value={date}
            change={(value) => change(() => setDate(value))}
          />
          <FormSelect
            id="agenda-provider"
            label="Provider filter"
            value={provider}
            onChange={(value) => change(() => setProvider(value))}
            options={[
              { value: "all", label: "All permitted providers" },
              ...setup.providers.map((row) => ({ value: row.id, label: row.name })),
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
            <div className="divide-y divide-border border-y border-border">
              {!parsed.data.items.length && (
                <p className="py-7 text-sm text-muted-foreground">
                  No appointments for this date and filter. Book a visit or check in a walk-in from
                  Queue.
                </p>
              )}
              {parsed.data.items.map((row) => (
                <article key={row.id} className="grid gap-4 py-5 md:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <h3 className="font-semibold wrap-anywhere">
                      {row.patient}{" "}
                      <span className="font-normal text-muted-foreground">{row.reference}</span>
                    </h3>
                    <p className="mt-2 text-sm">
                      {clock(row.start, setup.timezone)} · {row.provider} ·{" "}
                      {row.resource ?? "No room reserved"}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {row.status.replaceAll("_", " ")} · {row.type.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.status === "booked" && (
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
                          Reschedule
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
            <div className="flex gap-3">
              {after && (
                <Button type="button" variant="outline" onClick={() => setAfter(null)}>
                  Latest bookings
                </Button>
              )}
              {parsed.data.has_next_page && (
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
      {editing && (
        <OperationSection title="Reschedule booking">
          <BookingForm
            key={`${editing.id}:${editing.version}`}
            setup={setup}
            appointment={editing}
            reload={remote.reload}
            close={() => void guard(() => setEditing(null))}
          />
        </OperationSection>
      )}
    </>
  );
}
