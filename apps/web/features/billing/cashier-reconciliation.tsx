"use client";

import { useState } from "react";
import { z } from "zod";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import { DateInput, writtenDate } from "@/components/application/date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState, RemoteNotice } from "@/features/patients/feedback";
import { localDate } from "@/features/operations/schema";
import { CashierReconciliationDocument } from "@/lib/graphql/generated";
import { FinancialSection, Money } from "./controls";
import { moneyInput } from "./schema";

const schema = z.object({
  date: z.string(),
  branch: z.string(),
  timezone: z.string(),
  as_of: z.string(),
  rows: z.array(
    z.object({
      currency: z.string(),
      method: z.string(),
      payments: z.string(),
      refunds: z.string(),
      net: z.string(),
      payment_count: z.number(),
      refund_count: z.number(),
    }),
  ),
});

export function CashierReconciliation({
  branchId,
  timezone,
}: {
  branchId: string;
  timezone: string;
}) {
  const { organizationId } = useWorkspace();
  const [day, setDay] = useState(localDate(timezone));
  const [open, setOpen] = useState(false);
  const remote = useRemote(
    CashierReconciliationDocument,
    { organizationId, branchId, day },
    { enabled: open, refreshOnFocus: false },
  );
  const parsed = schema.safeParse(remote.data?.cashierReconciliation);
  return (
    <FinancialSection title="Cashier day review">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Review payments and refunds by recorded date before closing your shift. This worksheet
          does not close a till or change the ledger.
        </p>
        <Button type="button" variant="outline" aria-expanded={open} onClick={() => setOpen(!open)}>
          <ClipboardCheck aria-hidden />
          {open ? "Hide day review" : "Review cashier day"}
        </Button>
      </div>
      {open && (
        <div className="grid min-w-0 gap-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-60 max-w-full">
              <FormField id="cashier-day" label="Recorded payment date">
                <DateInput
                  id="cashier-day"
                  value={day}
                  max={localDate(timezone)}
                  onChange={(event) => {
                    if (event.target.value) setDay(event.target.value);
                  }}
                />
              </FormField>
            </div>
            <Button
              type="button"
              variant="outline"
              aria-disabled={remote.loading}
              onClick={() => {
                if (!remote.loading) remote.reload();
              }}
            >
              <RefreshCw aria-hidden />
              {remote.loading ? "Updating…" : "Refresh day"}
            </Button>
          </div>
          {!parsed.success ? (
            <LoadState error={remote.error} retry={remote.reload} />
          ) : (
            <>
              <RemoteNotice error={remote.error} retry={remote.reload} />
              <p className="text-xs text-muted-foreground">
                {parsed.data.branch} · {writtenDate(parsed.data.date)} · Read at{" "}
                {new Intl.DateTimeFormat("en-PH", {
                  timeStyle: "short",
                  timeZone: parsed.data.timezone,
                }).format(new Date(parsed.data.as_of))}{" "}
                ({parsed.data.timezone})
              </p>
              {!parsed.data.rows.length && (
                <p className="rounded-lg bg-muted/40 p-4 text-sm">
                  No payments or refunds recorded for this date.
                </p>
              )}
              {!!parsed.data.rows.length && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">
                      Ledger reconciliation by currency and original payment method
                    </caption>
                    <thead className="border-b border-border text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="p-3">
                          Method
                        </th>
                        <th scope="col" className="p-3 text-right">
                          Payments
                        </th>
                        <th scope="col" className="p-3 text-right">
                          Refunds
                        </th>
                        <th scope="col" className="p-3 text-right">
                          Net
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parsed.data.rows.map((row) => (
                        <tr key={`${row.currency}:${row.method}`}>
                          <th scope="row" className="p-3 font-medium capitalize">
                            {row.method.replaceAll("_", " ")} · {row.currency}
                            <span className="mt-1 block text-xs font-normal text-muted-foreground">
                              {row.payment_count} payments · {row.refund_count} refunds
                            </span>
                          </th>
                          <td className="p-3 text-right tabular-nums">
                            <Money value={row.payments} code={row.currency} />
                          </td>
                          <td className="p-3 text-right tabular-nums">
                            <Money value={row.refunds} code={row.currency} />
                          </td>
                          <td className="p-3 text-right font-semibold tabular-nums">
                            <Money value={row.net} code={row.currency} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs leading-5 text-muted-foreground">
                Refunds use their own recorded return date and are grouped by the original payment
                method. A refund may relate to an earlier day; the return method is not recorded.
                Backdated entries can change this summary. All permitted staff in this branch are
                included.
              </p>
              <CashCount
                key={`${branchId}:${day}`}
                cash={
                  parsed.data.rows.find((row) => row.method === "cash" && row.currency === "PHP")
                    ?.payments ?? "0.00"
                }
              />
            </>
          )}
        </div>
      )}
    </FinancialSection>
  );
}

function CashCount({ cash }: { cash: string }) {
  const [opening, setOpening] = useState("");
  const [returns, setReturns] = useState("");
  const [counted, setCounted] = useState("");
  const valid = [opening, returns, counted].every((value) => moneyInput.safeParse(value).success);
  const cents = (value: string) => Math.round(Number(value) * 100);
  const expected = valid ? cents(opening) + cents(cash) - cents(returns) : 0;
  const difference = valid ? cents(counted) - expected : 0;
  return (
    <section
      aria-label="Local cash count worksheet"
      className="grid gap-4 border-t border-border pt-5"
    >
      <div>
        <h3 className="text-sm font-semibold">Cash count worksheet · PHP</h3>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
          Enter the cash actually returned, regardless of the original payment method. Amounts stay
          on this screen only. This assumes no other till movements; use your clinic’s closing
          process for deposits, expenses or transfers.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { id: "opening", label: "Opening cash (PHP)", value: opening, set: setOpening },
          { id: "returns", label: "Cash actually returned (PHP)", value: returns, set: setReturns },
          { id: "counted", label: "Cash counted (PHP)", value: counted, set: setCounted },
        ].map((field) => (
          <FormField
            key={field.id}
            id={`cash-${field.id}`}
            label={field.label}
            error={
              field.value && !moneyInput.safeParse(field.value).success
                ? "Use a nonnegative amount with up to two decimals."
                : undefined
            }
          >
            <Input
              id={`cash-${field.id}`}
              inputMode="decimal"
              maxLength={10}
              value={field.value}
              placeholder="0.00"
              onChange={(event) => field.set(event.target.value)}
            />
          </FormField>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Recorded cash payments: <Money value={cash} /> · Opening cash + recorded cash payments −
        actual cash returns = expected cash.
      </p>
      {valid && (
        <dl
          aria-live="polite"
          className="flex flex-wrap gap-x-10 gap-y-3 rounded-lg bg-muted/40 p-4 text-sm"
        >
          <div>
            <dt className="text-xs text-muted-foreground">Expected cash</dt>
            <dd className="mt-1 font-semibold">
              <Money value={(expected / 100).toFixed(2)} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Counted minus expected</dt>
            <dd className="mt-1 font-semibold">
              <Money value={(difference / 100).toFixed(2)} /> ·{" "}
              {difference === 0 ? "Matches" : difference > 0 ? "Over" : "Short"}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
