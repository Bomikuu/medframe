"use client";

import { z } from "zod";
import { CalendarDays, Clock3, CreditCard, Bell, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { PersonIdentity } from "@/components/application/person-identity";
import { StatusBadge } from "@/components/application/status-badge";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState, RemoteNotice } from "@/features/patients/feedback";
import { appointmentSchema, ticketSchema, clock } from "@/features/operations/schema";
import { Money } from "@/features/billing/controls";
import { PatientTaskHomeDocument } from "@/lib/graphql/portal/generated";
import { getPortalClient } from "@/lib/graphql/portal/client";
import { usePortal } from "./portal-provider";

const homeSchema = z.object({
  as_of: z.string(),
  timezone: z.string(),
  next_appointment: appointmentSchema.nullable(),
  tickets: z.array(ticketSchema),
  balances: z.array(
    z.object({
      currency: z.string(),
      outstanding: z.string(),
      due_now: z.string(),
      overdue: z.string(),
      future: z.string(),
    }),
  ),
});

export function PatientTaskHome() {
  const { linkId, href } = usePortal();
  const remote = useRemote(
    PatientTaskHomeDocument,
    { linkId },
    { client: getPortalClient, refreshOnFocus: false },
  );
  const parsed = homeSchema.safeParse(remote.data?.patientTaskHome);
  const data = parsed.success ? parsed.data : null;
  return (
    <section aria-labelledby="patient-next-actions" className="grid min-w-0 gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="patient-next-actions" className="text-2xl font-semibold">
            Your next steps
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Appointments, your clinic queue and payments in one place.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          aria-disabled={remote.loading}
          onClick={() => {
            if (!remote.loading) remote.reload();
          }}
        >
          <RefreshCw aria-hidden className="size-4" />
          {remote.loading ? "Updating…" : "Refresh"}
        </Button>
      </header>
      {!data ? (
        <LoadState
          error={
            remote.error ?? (remote.data ? new Error("Patient tasks could not be read.") : null)
          }
          retry={remote.reload}
        />
      ) : (
        <>
          <RemoteNotice error={remote.error} retry={remote.reload} />
          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <section
              className="grid min-w-0 gap-4 rounded-xl border border-border bg-card p-5 sm:p-6"
              aria-label="Next appointment"
            >
              <h2 className="flex items-center gap-2 font-semibold">
                <CalendarDays aria-hidden className="size-5 text-teal-ink" />
                Next appointment
              </h2>
              {data.next_appointment ? (
                <>
                  <p className="text-lg font-semibold">
                    {data.next_appointment.online_timing_mode === "instant"
                      ? "Instant online consultation"
                      : clock(data.next_appointment.start, data.timezone)}
                  </p>
                  <PersonIdentity
                    kind="provider"
                    name={data.next_appointment.provider}
                    imageId={data.next_appointment.provider_photo_id}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <StatusBadge value={data.next_appointment.status} />
                    <span>
                      {data.next_appointment.branch} · {data.timezone}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {data.next_appointment.status === "booked"
                      ? data.next_appointment.online_room_id
                        ? data.next_appointment.online_timing_mode === "instant"
                          ? "Open the room when your doctor is ready. The doctor admits you and ends the consultation."
                          : "The online room opens ten minutes before the appointment. Your clinic PIN is still required."
                        : "This booking reserves your appointment. Reception confirms your arrival and queue admission separately."
                      : "Your arrival is recorded. Follow your queue number or the clinic’s instructions."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.next_appointment.online_room_id && (
                      <ButtonLink
                        href={`/appointments/room/${data.next_appointment.online_room_id}`}
                      >
                        Open online room
                        <ArrowRight aria-hidden className="size-4" />
                      </ButtonLink>
                    )}
                    <ButtonLink variant="outline" href={href("/portal/appointments")}>
                      View or change appointment
                    </ButtonLink>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    No upcoming booking is recorded. Contact the clinic to arrange your next visit.
                  </p>
                  <ButtonLink
                    variant="outline"
                    className="w-fit"
                    href={href("/portal/appointments")}
                  >
                    My appointments
                    <ArrowRight aria-hidden className="size-4" />
                  </ButtonLink>
                </>
              )}
            </section>
            <section
              className="grid min-w-0 gap-4 rounded-xl border border-border bg-card p-5 sm:p-6"
              aria-label="Your queue today"
            >
              <h2 className="flex items-center gap-2 font-semibold">
                <Clock3 aria-hidden className="size-5 text-teal-ink" />
                Your queue
              </h2>
              {data.tickets.length ? (
                <ul className="divide-y divide-border">
                  {data.tickets.map((ticket) => (
                    <li key={ticket.id} className="grid gap-2 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-lg tabular-nums">#{ticket.number}</strong>
                        <StatusBadge value={ticket.status} />
                      </div>
                      <PersonIdentity kind="provider" name={ticket.provider} />
                      <p className="text-xs leading-5 text-muted-foreground">
                        {ticket.estimate?.label ??
                          "No reliable wait estimate. Ask reception for the next step."}
                        {ticket.delay > 0 ? ` · ${ticket.delay}-minute delay recorded.` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  No active consultation ticket. A confirmed booking and a place in today’s queue
                  are separate.
                </p>
              )}
              <ButtonLink variant="outline" className="w-fit" href={href("/portal/queue")}>
                View queue
                <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
            </section>
          </div>
          <section
            aria-label="Your payment obligations"
            className="grid min-w-0 gap-4 rounded-xl border border-border bg-card p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <CreditCard aria-hidden className="size-5 text-teal-ink" />
                Payments to plan for
              </h2>
              <ButtonLink variant="outline" href={href("/portal/billing")}>
                View statements
                <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
            </div>
            {!data.balances.length ? (
              <p className="text-sm text-muted-foreground">
                No issued statements are recorded for this patient connection.
              </p>
            ) : (
              data.balances.map((balance) => (
                <dl
                  key={balance.currency}
                  className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4"
                >
                  {[
                    ["Due through today", balance.due_now],
                    ["Of that, overdue", balance.overdue],
                    ["Scheduled for later", balance.future],
                    ["Total outstanding", balance.outstanding],
                  ].map(([label, amount]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground">
                        {label} · {balance.currency}
                      </dt>
                      <dd className="mt-2 font-semibold tabular-nums">
                        <Money value={amount} code={balance.currency} />
                      </dd>
                    </div>
                  ))}
                </dl>
              ))
            )}
            <p className="text-xs leading-5 text-muted-foreground">
              Based on all your issued statements and recorded payments, credits and refunds. Future
              installments are not due yet. Opening a statement does not charge you.
            </p>
          </section>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Manual refresh · {clock(data.as_of, data.timezone)}</span>
            <ButtonLink variant="ghost" href={href("/portal/reminders")}>
              <Bell aria-hidden className="size-4" />
              Clinic updates
            </ButtonLink>
          </div>
        </>
      )}
    </section>
  );
}
