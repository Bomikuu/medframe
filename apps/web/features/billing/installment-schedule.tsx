"use client";

import { useId, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { dateLabel } from "@/features/patients/feedback";
import { Money } from "./controls";
import type { Due } from "./installment-schema";

export function DueSummary({ due }: { due: Due }) {
  return (
    <dl className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-5 text-sm sm:grid-cols-4">
      {[
        ["Due through today", due.due_now],
        ["Overdue", due.overdue],
        ["Future payments", due.future],
        ["Total outstanding", due.outstanding],
      ].map(([label, amount]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-2 font-semibold tabular-nums">
            <Money value={amount} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

type Filter = "all" | "due" | "upcoming" | "settled";
const choices: { value: Filter; label: string; empty: string }[] = [
  { value: "all", label: "All", empty: "No payments are scheduled." },
  { value: "due", label: "Due", empty: "No installments are due through today." },
  { value: "upcoming", label: "Upcoming", empty: "No unpaid installments have future due dates." },
  {
    value: "settled",
    label: "Settled",
    empty: "No installments have been fully paid or credited yet.",
  },
];

function matches(row: Due["rows"][number], filter: Filter) {
  const unpaid = Number(row.remaining) > 0;
  if (filter === "due") return unpaid && ["overdue", "due_today"].includes(row.date_state);
  if (filter === "upcoming") return unpaid && row.date_state === "upcoming";
  if (filter === "settled") return !unpaid;
  return true;
}

function coverageLabel(row: Due["rows"][number], state: string) {
  if (state === "void") return "Voided";
  if (row.coverage_state === "credited") return "Credited";
  if (row.coverage_state === "paid") return "Paid";
  const timing =
    row.date_state === "overdue"
      ? "Overdue"
      : row.date_state === "due_today"
        ? "Due today"
        : "Upcoming";
  return row.coverage_state === "partial" ? `${timing} · Partially covered` : timing;
}

export function InstallmentSchedule({
  due,
  draft = false,
  state = draft ? "draft" : "issued",
}: {
  due: Due;
  draft?: boolean;
  state?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const tableId = useId();
  if (!due.is_installment) return null;
  const active = state === "issued";
  const visible = due.rows.filter((row) => !active || matches(row, filter));
  return (
    <section
      aria-label={draft ? "Proposed installment schedule" : "Installment schedule"}
      className="grid min-w-0 gap-4 rounded-xl border border-border bg-card p-5"
    >
      <div>
        <h3 className="font-semibold">
          {draft ? "Review installment schedule" : "Installment schedule"}
        </h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {state === "void"
            ? "This invoice is voided. The original schedule is retained for history; no payment is due."
            : draft
              ? "These are proposed amounts. Issuing confirms the agreement; it does not record payments."
              : "Current coverage uses recorded payments and refunds. Credits reduce the latest obligations first."}
        </p>
      </div>
      {active && <DueSummary due={due} />}
      {active && (
        <div role="group" aria-label="Filter installments" className="flex flex-wrap gap-2">
          {choices.map((choice) => (
            <Button
              key={choice.value}
              type="button"
              size="sm"
              variant={filter === choice.value ? "default" : "outline"}
              aria-pressed={filter === choice.value}
              aria-controls={tableId}
              onClick={() => setFilter(choice.value)}
            >
              {choice.label}{" "}
              <span className="text-xs tabular-nums">
                ({due.rows.filter((row) => matches(row, choice.value)).length})
              </span>
            </Button>
          ))}
        </div>
      )}
      <p role="status" className="text-xs text-muted-foreground">
        Showing {visible.length} of {due.rows.length} scheduled payments
        {active ? ". Filters change this view only." : "."}
      </p>
      <div id={tableId} className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead className="text-right">Agreed</TableHead>
              {!draft && (
                <>
                  <TableHead className="text-right">Credited</TableHead>
                  <TableHead className="text-right">Covered</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Status</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!visible.length && (
              <TableRow>
                <TableCell
                  colSpan={draft ? 3 : 7}
                  className="h-24 text-center whitespace-normal text-muted-foreground"
                >
                  {choices.find((choice) => choice.value === filter)?.empty}
                </TableCell>
              </TableRow>
            )}
            {visible.map((row) => (
              <TableRow key={row.id || row.position}>
                <TableCell className="whitespace-nowrap">
                  {row.kind === "deposit"
                    ? "Down payment"
                    : `Monthly ${row.position + 1 - (due.rows[0]?.kind === "deposit" ? 1 : 0)}`}
                </TableCell>
                <TableCell className="whitespace-nowrap">{dateLabel(row.due_date)}</TableCell>
                <TableCell className="text-right">
                  <Money value={row.original} />
                </TableCell>
                {!draft && (
                  <>
                    <TableCell className="text-right">
                      <Money value={row.credited} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={row.covered} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={row.remaining} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{coverageLabel(row, state)}</TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
