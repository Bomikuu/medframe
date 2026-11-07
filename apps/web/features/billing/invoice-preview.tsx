"use client";

import { dateLabel } from "@/features/patients/feedback";
import { Money } from "./controls";
import type { DraftPreview } from "./schema";

export function InvoicePreview({ value }: { value: DraftPreview }) {
  const plan = value.installment;
  return (
    <section aria-label="Calculated draft preview" className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">
            {plan ? "Payment plan preview" : "Invoice preview"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">Proposed total</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            <Money value={value.total} />
          </p>
        </div>
        <span className="rounded-md bg-warning-soft px-2 py-1 text-xs font-medium text-warning">
          Not saved
        </span>
      </div>
      {plan && (
        <>
          <p className="text-sm leading-6">
            <strong className="font-semibold">
              <Money value={plan.regular} />
            </strong>{" "}
            per month · {plan.months} monthly payments
            {plan.final !== plan.regular && (
              <>
                {" "}
                · final payment <Money value={plan.final} />
              </>
            )}
          </p>
          <dl className="grid gap-x-5 gap-y-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
            {[
              ["Down payment", plan.deposit],
              ["Financed after down payment", plan.financed],
            ].map(([label, amount]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-semibold">
                  <Money value={amount} />
                </dd>
              </div>
            ))}
            <div>
              <dt className="text-xs text-muted-foreground">First monthly payment</dt>
              <dd className="mt-1">{dateLabel(plan.first_due)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Final monthly payment</dt>
              <dd className="mt-1">{dateLabel(plan.last_due)}</dd>
            </div>
          </dl>
          <p className="text-xs leading-5 text-muted-foreground">
            Short months use their last day. Any rounding adjustment is included in the final
            payment.
          </p>
          <details className="border-t border-border pt-2">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
              Review all {plan.rows.length} proposed payments
            </summary>
            <div
              className="relative max-h-72 overflow-auto"
              tabIndex={0}
              role="region"
              aria-label="Proposed payment dates and amounts"
            >
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="py-3">
                      Payment
                    </th>
                    <th scope="col" className="px-3 py-3">
                      Due date
                    </th>
                    <th scope="col" className="py-3 text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {plan.rows.map((row, index) => (
                    <tr key={`${row.kind}:${row.due_date}`} className="border-b border-border/60">
                      <td className="py-3">
                        {row.kind === "deposit"
                          ? "Down payment"
                          : `Monthly ${index + (Number(plan.deposit) > 0 ? 0 : 1)}`}
                      </td>
                      <td className="px-3 py-3">{dateLabel(row.due_date)}</td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <Money value={row.amount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
      <details className="border-t border-border pt-2">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
          Price breakdown
        </summary>
        <dl className="grid gap-2 pb-2 text-sm">
          {[
            ["Subtotal", value.subtotal],
            ["Discount", value.discount],
            ["Proposed total", value.total],
          ].map(([label, amount]) => (
            <div key={label} className="flex flex-wrap justify-between gap-2">
              <dt>{label}</dt>
              <dd className="font-semibold">
                <Money value={amount} />
              </dd>
            </div>
          ))}
        </dl>
      </details>
      <p className="text-xs leading-5 text-muted-foreground">
        This preview is not saved. Saving checks the amounts again; review the saved agreement
        before issuing. No payment has been charged or received.
      </p>
    </section>
  );
}
