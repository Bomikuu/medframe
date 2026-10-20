"use client";

import { useState } from "react";
import { FinancialOverviewDocument } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { FormSelect } from "@/features/patients/form-controls";
import { dateLabel, LoadState } from "@/features/patients/feedback";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { ComparisonChart } from "./comparison-chart";
import { financialOverviewSchema, money } from "./schema";

export function FinancialOverviewPanel({
  branchId,
  compact = false,
  periodDays,
}: {
  branchId?: string;
  compact?: boolean;
  periodDays?: number;
}) {
  const { organizationId, workspace, can, href } = useWorkspace();
  const [branch, setBranch] = useState(workspace.branches[0]?.id ?? "");
  const [days, setDays] = useState("30");
  const [currency, setCurrency] = useState("");
  const selectedBranch = branchId ?? branch;
  const remote = useRemote(
    FinancialOverviewDocument,
    { organizationId, branchId: selectedBranch, days: periodDays ?? Number(days) },
    { enabled: can("billing.read") && !!selectedBranch },
  );
  const parsed = financialOverviewSchema.safeParse(remote.data?.financialOverview);
  if (!can("billing.read")) return null;
  const data = parsed.success ? parsed.data : null;
  const value = data?.currencies.find((row) => row.currency === currency) ?? data?.currencies[0];
  const compare = (current: string, previous: string) => {
    const delta = Number(current) - Number(previous);
    return `${delta >= 0 ? "+" : "−"}${money(Math.abs(delta), value!.currency)} vs previous period`;
  };
  return (
    <section
      aria-label="Financial overview"
      className="grid min-w-0 gap-5 rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            {compact ? "Clinic finances" : "Financial overview"}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            Recorded payments and invoice balances. Current receivables are shown separately from
            the comparison period.
          </p>
        </div>
        {compact && (
          <ButtonLink variant="outline" href={href("/clinic/billing")}>
            Open billing
          </ButtonLink>
        )}
      </div>
      <div className="flex min-w-0 flex-wrap items-end gap-3">
        {!branchId && (
          <div className="min-w-48 flex-1">
            <FormSelect
              id="finance-branch"
              label="Financial branch"
              value={branch}
              onChange={setBranch}
              options={workspace.branches.map((row) => ({ value: row.id, label: row.name }))}
            />
          </div>
        )}
        {periodDays === undefined && (
          <div className="min-w-40 flex-1">
            <FormSelect
              id={compact ? "dashboard-finance-period" : "billing-finance-period"}
              label="Comparison period"
              value={days}
              onChange={setDays}
              options={[7, 30, 90].map((day) => ({
                value: String(day),
                label: `Last ${day} completed days`,
              }))}
            />
          </div>
        )}
        {data && data.currencies.length > 1 && (
          <div className="w-32">
            <FormSelect
              id="finance-currency"
              label="Currency"
              value={value?.currency ?? ""}
              onChange={setCurrency}
              options={data.currencies.map((row) => ({ value: row.currency, label: row.currency }))}
            />
          </div>
        )}
        {data && (
          <p className="min-w-0 flex-1 basis-64 text-xs leading-5 text-muted-foreground">
            {dateLabel(data.current_from)} – {dateLabel(data.current_to)}
            <br />
            Compared with {dateLabel(data.previous_from)} – {dateLabel(data.previous_to)} ·{" "}
            {data.timezone}
          </p>
        )}
      </div>
      {!data || !value ? (
        remote.error ? (
          <LoadState error={remote.error} retry={remote.reload} />
        ) : remote.data ? (
          <p role="alert">Financial summaries could not be read.</p>
        ) : (
          <div
            role="status"
            aria-label="Loading financial overview"
            className="grid gap-3 sm:grid-cols-4"
          >
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        )
      ) : (
        <>
          <dl className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-5 border-y border-border py-5 lg:grid-cols-4">
            {[
              {
                label: "Net recorded payments",
                amount: value.current.net,
                detail: compare(value.current.net, value.previous.net),
              },
              {
                label: "Invoice value issued",
                amount: value.current.issued,
                detail: compare(value.current.issued, value.previous.issued),
              },
              {
                label: "Total outstanding",
                amount: value.outstanding,
                detail: `${money(value.due_now, value.currency)} due through today · ${money(value.future, value.currency)} future`,
              },
              {
                label: "Refunds recorded",
                amount: value.current.refunds,
                detail: compare(value.current.refunds, value.previous.refunds),
              },
            ].map((metric) => (
              <div key={metric.label} className="min-w-0">
                <dt className="text-xs font-medium text-muted-foreground">{metric.label}</dt>
                <dd className="mt-2 text-xl font-bold break-words tabular-nums sm:text-2xl">
                  {money(metric.amount, value.currency)}
                </dd>
                <dd className="mt-2 text-xs leading-5 text-muted-foreground">{metric.detail}</dd>
              </div>
            ))}
          </dl>
          <div
            className={
              compact ? "min-w-0" : "grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_260px]"
            }
          >
            <ComparisonChart
              key={`${data.days}:${value.currency}:${data.branch_id}`}
              value={value}
            />
            {!compact && (
              <div className="grid content-start gap-6 border-t border-border pt-5 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-5">
                <section>
                  <h3 className="text-sm font-semibold">Receivables aging</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    As of now · {money(value.overdue, value.currency)} overdue
                  </p>
                  <dl className="mt-4 space-y-3">
                    {value.aging.map((row) => (
                      <div key={row.label}>
                        <div className="mb-1.5 flex justify-between gap-2 text-xs">
                          <dt>{row.label}</dt>
                          <dd className="font-medium tabular-nums">
                            {money(row.amount, value.currency)}
                          </dd>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${Number(value.outstanding) > 0 ? (Number(row.amount) / Number(value.outstanding)) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </dl>
                </section>
                <section>
                  <h3 className="text-sm font-semibold">Payment methods</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Gross payments recorded in this period
                  </p>
                  <dl className="mt-3 space-y-2">
                    {value.methods.map((row) => (
                      <div key={row.method} className="flex justify-between gap-2 text-xs">
                        <dt className="capitalize">{row.method.replaceAll("_", " ")}</dt>
                        <dd className="font-medium tabular-nums">
                          {money(row.amount, value.currency)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {!value.methods.length && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      No payments in this period.
                    </p>
                  )}
                </section>
              </div>
            )}
          </div>
          <p className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            Net recorded payments = payments less refunds, using their recorded payment dates. These
            figures are not profit or accounting revenue. Today is excluded from the period
            comparison; receivables include today’s recorded changes. Medframe records settlement
            made elsewhere.
          </p>
        </>
      )}
    </section>
  );
}
