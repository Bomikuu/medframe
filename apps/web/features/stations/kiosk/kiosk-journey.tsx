"use client";
import { useEffect, useState } from "react";
import { LoadingInformation } from "@/components/application/loading-information";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import {
  clinicTime,
  kioskRequest,
  type Balances,
  type Setup,
  type Selection,
  type Slot,
  type Snapshot,
  type Task,
} from "./types";

export function KioskJourney({
  setup,
  task,
  snapshot,
  selection,
  onSelection,
  busy,
  onReview,
  onError,
}: {
  setup: Setup;
  task: Task;
  snapshot: Snapshot | null;
  selection: Selection;
  onSelection: (value: Selection) => void;
  busy: boolean;
  onReview: () => void;
  onError: (error: string) => void;
}) {
  const [availability, setAvailability] = useState<{ key: string; slots: Slot[] }>({
    key: "",
    slots: [],
  });
  const { department_id, provider_id, date } = selection;
  const slotKey = `${department_id}:${provider_id}:${date}`;
  const loading =
    task === "booking" &&
    !!department_id &&
    !!provider_id &&
    !!date &&
    availability.key !== slotKey;
  const slots = availability.key === slotKey ? availability.slots : [];
  const [bills, setBills] = useState<Balances | null>(null);
  const [billError, setBillError] = useState("");
  const [billAttempt, setBillAttempt] = useState(0);
  const change = (value: Partial<Selection>) => onSelection({ ...selection, ...value });
  const department = setup.departments.find((item) => item.id === selection.department_id);
  useEffect(() => {
    if (task !== "booking" || !department_id || !provider_id || !date) return;
    let cancelled = false;
    void kioskRequest<{ slots: Slot[] }>({ action: "slots", department_id, provider_id, date })
      .then((value) => {
        if (!cancelled) setAvailability({ key: slotKey, slots: value.slots });
      })
      .catch((cause) => {
        if (!cancelled) {
          setAvailability({ key: slotKey, slots: [] });
          onError(cause.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [task, department_id, provider_id, date, slotKey, onError]);
  useEffect(() => {
    if (task !== "payments") return;
    let cancelled = false;
    void kioskRequest<Balances>({ action: "balances" })
      .then((value) => {
        if (!cancelled) setBills(value);
      })
      .catch((cause) => {
        if (!cancelled) {
          setBillError(cause.message);
          onError(cause.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [task, onError, billAttempt]);
  const departments = setup.departments.filter((item) =>
    task === "booking" || task === "check_in"
      ? item.kind === "consultation"
      : task === "payments"
        ? item.kind === "cashier"
        : true,
  );
  const ready =
    !!department &&
    (task === "payments" || task === "check_in"
      ? task === "payments" || !!selection.appointment_id
      : department.kind !== "consultation" || !!selection.provider_id) &&
    (task !== "booking" || !!selection.start);
  return (
    <div className="grid gap-7">
      {task === "payments" && (
        <section aria-label="Your bills" className="grid gap-4">
          <p className="bg-teal-wash rounded-lg p-4 text-sm leading-6 text-teal-ink">
            Review your bills, then pay at the clinic cashier. Digital payment and cash acceptance
            on this kiosk are not configured.
          </p>
          {!bills ? (
            billError ? (
              <div className="grid gap-3">
                <p role="alert" className="text-sm">
                  Your bills could not be loaded. Your current task is still open.
                </p>
                <Button
                  variant="outline"
                  className="justify-self-start"
                  onClick={() => {
                    setBillError("");
                    setBillAttempt((value) => value + 1);
                  }}
                >
                  Retry bills
                </Button>
              </div>
            ) : (
              <LoadingInformation
                title="Loading your bills"
                detail="Retrieving issued bills and recorded outstanding amounts for your verified patient session."
              />
            )
          ) : !bills.invoices.length ? (
            <p>No issued bills to show.</p>
          ) : (
            bills.invoices.map((invoice) => (
              <div key={invoice.number} className="border-b border-border py-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className="font-semibold">Bill {invoice.number}</h3>
                  <span className="font-semibold tabular-nums">
                    {invoice.currency} {invoice.due?.due_now ?? invoice.outstanding} due through
                    today
                    {invoice.due && (
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {invoice.currency} {invoice.due.future} scheduled for future dates ·{" "}
                        {invoice.outstanding} total outstanding
                      </span>
                    )}
                  </span>
                </div>
                <ul className="mt-3 grid gap-2 text-sm">
                  {invoice.lines.map((line, index) => (
                    <li key={index} className="flex justify-between gap-3">
                      <span>
                        {line.description} × {line.quantity}
                      </span>
                      <span className="tabular-nums">{line.amount}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Total {invoice.total} · Recorded payments {invoice.paid} · {invoice.status}
                </p>
              </div>
            ))
          )}
        </section>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormSelect
          id="kiosk-service"
          label={task === "payments" ? "Cashier" : "Service / department"}
          value={selection.department_id}
          onChange={(value) =>
            change({ department_id: value, provider_id: "", start: "", appointment_id: "" })
          }
          options={departments.map((item) => ({ value: item.id, label: item.name }))}
          disabled={busy}
        />
        {(task === "booking" || task === "walk_in") && department?.kind === "consultation" && (
          <FormSelect
            id="kiosk-provider"
            label="Doctor / dentist"
            value={selection.provider_id}
            onChange={(value) => change({ provider_id: value, start: "" })}
            options={setup.providers.map((item) => ({ value: item.id, label: item.name }))}
            disabled={busy}
          />
        )}
      </div>
      {!departments.length && (
        <p className="text-sm text-muted-foreground">
          This service is not configured. Please ask reception.
        </p>
      )}
      {task === "booking" && (
        <>
          <div className="max-w-xs">
            <FormField id="kiosk-date" label="Appointment date">
              <Input
                id="kiosk-date"
                type="date"
                value={selection.date}
                onChange={(event) => change({ date: event.target.value, start: "" })}
                className="h-12"
              />
            </FormField>
          </div>
          <section aria-label="Available times">
            <h3 className="mb-3 font-semibold">
              Available times{" "}
              <span className="text-sm font-normal text-muted-foreground">· {setup.timezone}</span>
            </h3>
            {loading ? (
              <p role="status">Checking availability…</p>
            ) : !slots.length ? (
              <p className="text-sm text-muted-foreground">
                Choose a service, provider and date. If no times are available, reception can help.
              </p>
            ) : (
              <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
                {slots.map((slot) => (
                  <Button
                    key={slot.start}
                    type="button"
                    variant={selection.start === slot.start ? "default" : "outline"}
                    aria-pressed={selection.start === slot.start}
                    onClick={() => change({ start: slot.start })}
                    className="min-h-12"
                  >
                    {clinicTime(slot.start, setup.timezone)}
                  </Button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      {task === "check_in" && (
        <section aria-label="Your appointments" className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Choose today’s appointment. Reception can help if it is outside your service’s arrival
            window.
          </p>
          {!snapshot ? (
            <LoadingInformation
              title="Finding your appointments"
              detail="Retrieving booked appointments for your verified patient session. Reception can help if your booking is missing or outside its arrival window."
            />
          ) : !snapshot.appointments.length ? (
            <p>No booked appointments were found.</p>
          ) : (
            snapshot.appointments.map((row) => (
              <Button
                key={row.id}
                type="button"
                variant={selection.appointment_id === row.id ? "default" : "outline"}
                aria-pressed={selection.appointment_id === row.id}
                onClick={() =>
                  change({ appointment_id: row.id, provider_id: row.provider_id, start: row.start })
                }
                className="min-h-20 justify-start px-5 text-left whitespace-normal"
              >
                <span className="grid gap-1">
                  <strong>{clinicTime(row.start, setup.timezone, true)}</strong>
                  <span>
                    {row.provider} · {row.status.replaceAll("_", " ")}
                  </span>
                </span>
              </Button>
            ))
          )}
        </section>
      )}
      {task === "walk_in" && (
        <p className="text-sm leading-6 text-muted-foreground">
          A consultation needs a doctor or dentist. Other departments use their own queue. Your
          visit stays together if staff transfer you.
        </p>
      )}
      {!!snapshot?.tickets.some((ticket) =>
        ["waiting", "called", "in_service"].includes(ticket.status),
      ) && (
        <p className="rounded-lg bg-muted p-4 text-sm">
          You already have an active ticket. Confirming the same service returns that ticket; ask
          staff to transfer you to another department.
        </p>
      )}
      <Button
        type="button"
        disabled={busy || loading || !ready}
        onClick={onReview}
        className="min-h-14 justify-self-start px-8"
      >
        Review {task === "booking" ? "appointment" : "queue admission"}
      </Button>
    </div>
  );
}
