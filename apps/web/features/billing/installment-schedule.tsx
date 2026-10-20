"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
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
export function InstallmentSchedule({ due, draft = false }: { due: Due; draft?: boolean }) {
  if (!due.is_installment) return null;
  return (
    <section className="grid min-w-0 gap-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h3 className="font-semibold">
          {draft ? "Review installment schedule" : "Installment schedule"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {draft
            ? "These are proposed amounts. Issuing confirms the agreement; it does not record payments."
            : "Current coverage uses recorded payments and refunds. Credits reduce the latest obligations first."}
        </p>
      </div>
      {!draft && <DueSummary due={due} />}
      <div className="overflow-x-auto">
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
            {due.rows.map((row, index) => (
              <TableRow key={row.id || index}>
                <TableCell className="whitespace-nowrap">
                  {row.kind === "deposit"
                    ? "Down payment"
                    : `Monthly ${index + 1 - (due.rows[0]?.kind === "deposit" ? 1 : 0)}`}
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
                    <TableCell className="whitespace-nowrap capitalize">
                      {row.coverage_state}
                      {Number(row.remaining) > 0 && ` · ${row.date_state.replaceAll("_", " ")}`}
                    </TableCell>
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
