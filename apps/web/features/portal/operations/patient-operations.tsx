"use client";

import { PortalKioskCode } from "@/features/stations/kiosk/portal-kiosk-code";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/features/patients/form-controls";
import { LoadState, failureText } from "@/features/patients/feedback";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { useSafety } from "@/features/workspace/safety-provider";
import { usePortal } from "@/features/portal/portal-provider";
import { getPortalClient } from "@/lib/graphql/portal/client";
import {
  MyOperationActionDocument,
  MyOperationAppointmentsDocument,
  MyOperationSlotsDocument,
} from "@/lib/graphql/portal/generated";
import {
  DateChoice,
  OperationNotice,
  OperationSection,
  OperationsLiveStatus,
} from "@/features/operations/controls";
import {
  clock,
  localDate,
  patientOperationsSchema,
  slotsSchema,
  type Appointment,
} from "@/features/operations/schema";
import { useOperationsLive } from "@/features/operations/use-operations";

export function PatientOperations({ queue = false }: { queue?: boolean }) {
  const { linkId } = usePortal();
  const remote = useRemote(
    MyOperationAppointmentsDocument,
    { linkId },
    { client: getPortalClient },
  );
  const connected = useOperationsLive({ link: linkId }, remote.reload);
  const parsed = patientOperationsSchema.safeParse(remote.data?.myAppointments);
  if (!parsed.success) return <LoadState error={remote.error} retry={remote.reload} />;
  const data = parsed.data;
  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-xl font-semibold">{queue ? "My queue" : "My appointments"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.branch} · {data.timezone}
        </p>
      </div>
      <PortalKioskCode key={linkId} />
      <OperationsLiveStatus connected={connected} updated={data.updated_at} />
      {!!remote.error && (
        <p role="alert" className="text-sm text-destructive">
          {failureText(remote.error)}
        </p>
      )}
      {queue ? (
        <>
          <p className="text-sm">
            Clinic activity: {data.waiting} waiting · {data.in_service} consulting
          </p>
          {!data.tickets.length && (
            <p className="py-5 text-sm text-muted-foreground">
              You do not have an active queue ticket. Reception can check you in when you arrive.
            </p>
          )}
          {data.tickets.map((row) => (
            <section
              key={row.id}
              className="grid gap-3 rounded-xl border border-border bg-card p-5"
            >
              <h3 className="text-lg font-semibold">Your ticket {row.number}</h3>
              <p className="text-sm">
                {row.provider} · {row.status.replaceAll("_", " ")}
              </p>
              <p className="text-sm">
                Position {row.position} · {row.ahead} ahead of you
              </p>
              <p className="text-xl font-semibold">
                {row.estimate?.label ?? "Estimate unavailable — ask reception"}
              </p>
              {row.delay > 0 && (
                <p className="text-sm">Reception recorded a {row.delay}-minute delay.</p>
              )}
              <p className="text-sm text-muted-foreground">
                This is a setting-based estimate, not a guaranteed start time. Your ticket remains
                active if the service day changes.
              </p>
            </section>
          ))}
        </>
      ) : (
        <>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Keep, reschedule or cancel your future booking below. For a checked-in or past
            appointment, contact the clinic directly.
          </p>
          {!data.appointments?.length && (
            <p className="py-5 text-sm text-muted-foreground">
              No appointments have been booked for this patient. Contact your clinic to arrange a
              visit.
            </p>
          )}
          {data.appointments?.map((row) => (
            <PatientAppointment
              key={`${row.id}:${row.version}`}
              row={row}
              zone={data.timezone}
              reload={remote.reload}
            />
          ))}
        </>
      )}
    </div>
  );
}

function PatientAppointment({
  row,
  zone,
  reload,
}: {
  row: Appointment;
  zone: string;
  reload: () => void;
}) {
  const { linkId } = usePortal();
  const { confirm } = useSafety();
  const capture = useRequestScope();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const receipt = useRef({ payload: "", id: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [date, setDate] = useState(localDate(zone));
  const [selected, setSelected] = useState("");
  const slots = useRemote(
    MyOperationSlotsDocument,
    { linkId, data: { appointment_id: row.id, date } },
    { client: getPortalClient, enabled: rescheduling && !!date },
  );
  const parsed = slotsSchema.safeParse(slots.data?.myAppointmentAvailability);
  const selectedValid = parsed.success && parsed.data.some((slot) => slot.start === selected);
  const run = async (action: string) => {
    if (pending.current) return;
    if (
      !(await confirm({
        title:
          action === "cancelled"
            ? "Cancel this appointment?"
            : action === "reschedule"
              ? "Confirm your new time?"
              : "Keep this appointment?",
        description:
          action === "reschedule"
            ? `${selectedValid ? clock(selected, zone) : "Choose a valid slot"}. The clinic will check availability when you confirm.`
            : `${clock(row.start, zone)} with ${row.provider}.`,
        action: "Confirm appointment choice",
      }))
    )
      return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const current = capture();
    const data = {
      action,
      expected_version: row.version,
      ...(action === "reschedule" ? { start: selected } : {}),
    };
    const payload = JSON.stringify(data);
    if (receipt.current.payload !== payload) receipt.current = { payload, id: crypto.randomUUID() };
    try {
      await getPortalClient().request(MyOperationActionDocument, {
        linkId,
        appointmentId: row.id,
        data,
        requestId: receipt.current.id,
      });
      if (current()) {
        setMessage("Your appointment choice was saved.");
        setRescheduling(false);
        reload();
        receipt.current = { payload: "", id: "" };
      }
    } catch (failure) {
      if (current()) setError(failureText(failure));
    } finally {
      pending.current = false;
      if (current()) setBusy(false);
    }
  };
  const available = row.status === "booked" && new Date(row.start) > new Date();
  return (
    <OperationSection title={clock(row.start, zone)}>
      <p className="text-sm">
        {row.provider} · {row.branch} · {row.status.replaceAll("_", " ")}
      </p>
      <OperationNotice message={message} error={error} />
      {available && (
        <div className="flex flex-wrap gap-3">
          <Button type="button" disabled={busy} onClick={() => void run("keep")}>
            Keep appointment
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => setRescheduling(!rescheduling)}
          >
            Reschedule appointment
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void run("cancelled")}
          >
            Cancel appointment
          </Button>
        </div>
      )}
      {rescheduling && (
        <div className="grid max-w-xl gap-4">
          <DateChoice
            id={`patient-new-date-${row.id}`}
            value={date}
            change={setDate}
            label={`New date (${zone})`}
          />
          {slots.loading ? (
            <p role="status" className="text-sm">
              Checking available times…
            </p>
          ) : slots.error ? (
            <p role="alert" className="text-sm text-destructive">
              {failureText(slots.error)}
            </p>
          ) : parsed.success && parsed.data.length ? (
            <FormSelect
              id={`patient-new-time-${row.id}`}
              label="New available time"
              value={selectedValid ? selected : ""}
              onChange={setSelected}
              options={parsed.data.map((slot) => ({
                value: slot.start,
                label: clock(slot.start, zone),
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No available times for this date. Choose another date or contact your clinic.
            </p>
          )}
          <Button
            type="button"
            disabled={busy || !selectedValid}
            onClick={() => void run("reschedule")}
          >
            Confirm new time
          </Button>
        </div>
      )}
    </OperationSection>
  );
}
