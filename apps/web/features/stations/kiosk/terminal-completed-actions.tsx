"use client";

import { CheckCircle2 } from "lucide-react";
import { clinicTime, taskNames, type Result, type Task } from "./types";

export type CompletedTerminalAction = { task: Task; result: Result };

export function TerminalCompletedActions({
  actions,
  timezone,
}: {
  actions: CompletedTerminalAction[];
  timezone: string;
}) {
  if (!actions.length) return null;
  return (
    <section aria-label="Completed this session" className="mt-7 border-t border-border pt-6">
      <h2 className="text-base font-semibold">Completed this session</h2>
      <ul className="mt-3 divide-y divide-border">
        {actions.map(({ task, result }, index) => (
          <li key={index} className="flex items-start gap-3 py-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-teal-ink" aria-hidden />
            <div>
              <p className="font-medium">
                {result.appointment
                  ? "Appointment booked"
                  : task === "payments"
                    ? "Cashier queue joined"
                    : task === "check_in"
                      ? "Arrival confirmed"
                      : "Queue ticket ready"}
              </p>
              <p className="mt-1 leading-6 text-muted-foreground">
                {result.ticket
                  ? `${result.ticket.label} · ${result.ticket.department}`
                  : result.appointment
                    ? clinicTime(result.appointment.start, timezone, true)
                    : taskNames[task]}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Only confirmed actions from this terminal session are listed. A cashier ticket is not a
        payment receipt.
      </p>
    </section>
  );
}
