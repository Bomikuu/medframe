"use client";

import { PersonIdentity } from "@/components/application/person-identity";

import { AccessRequired } from "@/components/application/access-required";

import { usePatientRecordReadOnly } from "@/features/patients/profile/patient-record-browse";

import { CashierReconciliation } from "./cashier-reconciliation";
import { FinancialOverviewPanel } from "./analytics/financial-overview";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  invoiceLinkFilters,
  invoiceListHref,
  balanceChoices,
  type InvoiceFilters,
} from "./invoice-list-links";
import { ReceiptText, Wallet, CreditCard } from "@/components/icons";
import { EntrySheet } from "@/components/application/entry-sheet";
import { StatusBadge } from "@/components/application/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/application/date-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { LoadState, PageHeading, RemoteNotice, dateLabel } from "@/features/patients/feedback";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { BillingInvoicesDocument } from "@/lib/graphql/generated";
import { useBillingSetup } from "./use-billing";
import { invoicePageSchema, type BillingSetup } from "./schema";
import { FinancialSection, Money, PageNavigation } from "./controls";
import { InvoiceForm } from "./invoice-form";

export function BillingPage() {
  const { can } = useWorkspace();
  if (!can("billing.read"))
    return (
      <AccessRequired
        title="Billing access required"
        description="Your clinic membership does not have billing access."
      />
    );
  return <BillingWorkspace />;
}
function BillingWorkspace() {
  const { can, href } = useWorkspace();
  const params = useSearchParams();
  const router = useRouter();
  const initialFilters = invoiceLinkFilters(params);
  const reportFrom = params.get("report_from");
  const reportTo = params.get("report_to");
  const report =
    reportFrom &&
    reportTo &&
    /^\d{4}-\d{2}-\d{2}$/.test(reportFrom) &&
    /^\d{4}-\d{2}-\d{2}$/.test(reportTo)
      ? { from: reportFrom, to: reportTo }
      : undefined;
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const remote = useBillingSetup(undefined, query);
  if (!remote.setup) return <LoadState error={remote.error} retry={remote.reload} />;
  return (
    <div className="grid gap-6">
      <PageHeading
        title="Billing"
        description="Issue statements, record payments and keep every financial adjustment traceable."
      />
      <FinancialOverviewPanel
        key={`finance:${remote.setup.branch_id}`}
        branchId={remote.setup.branch_id}
        periodRange={report ? { startDate: report.from, endDate: report.to } : undefined}
      />
      <CashierReconciliation
        key={remote.setup.branch_id}
        branchId={remote.setup.branch_id}
        timezone={remote.setup.timezone}
      />
      {report && (
        <Button asChild variant="ghost" className="w-fit">
          <Link href={invoiceListHref(href("/clinic/billing"), initialFilters)}>
            Change comparison period
          </Link>
        </Button>
      )}
      <InvoiceCollection
        key={`${remote.setup.branch_id}:${JSON.stringify(initialFilters)}`}
        setup={remote.setup}
        initialFilters={initialFilters}
        onFiltersChange={(next) =>
          router.replace(invoiceListHref(href("/clinic/billing"), next, report), { scroll: false })
        }
        patientSearch={
          can("billing.manage") ? (
            <form
              className="flex min-w-0 flex-wrap items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(search);
              }}
            >
              <FormField id="billing-patient-search" label="Find patient for a new invoice">
                <Input
                  id="billing-patient-search"
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
          ) : null
        }
      />
    </div>
  );
}
export function InvoiceCollection({
  setup,
  patientId,
  patientSearch,
  initialFilters = {},
  onFiltersChange,
}: {
  setup: BillingSetup;
  patientId?: string;
  patientSearch?: ReactNode;
  initialFilters?: InvoiceFilters;
  onFiltersChange?: (filters: InvoiceFilters) => void;
}) {
  const { organizationId, can, href } = useWorkspace();
  const readOnly = usePatientRecordReadOnly();
  const router = useRouter();
  const [after, setAfter] = useState<string | null>(null);
  const [search, setSearch] = useState(initialFilters.query ?? "");
  const [status, setStatus] = useState(initialFilters.status ?? "all");
  const [balance, setBalance] = useState(initialFilters.balance ?? "all");
  const [dateBasis, setDateBasis] = useState(initialFilters.date_basis ?? "created");
  const [from, setFrom] = useState(initialFilters.date_from ?? "");
  const [to, setTo] = useState(initialFilters.date_to ?? "");
  const [filters, setFilters] = useState<InvoiceFilters>(initialFilters);
  const apply = (next: InvoiceFilters) => {
    setAfter(null);
    if (onFiltersChange) onFiltersChange(next);
    else setFilters(next);
  };
  const remote = useRemote(BillingInvoicesDocument, {
    organizationId,
    branchId: setup.branch_id,
    filters,
    after,
    patientId: patientId ?? null,
  });
  const parsed = invoicePageSchema.safeParse(remote.data?.billingInvoices);
  return (
    <div id="invoices" className="grid scroll-mt-6 gap-6">
      <FinancialSection title="Invoices">
        {filters.balance && (
          <p role="status" className="rounded-lg bg-info-soft p-4 text-sm leading-6 text-info">
            {balanceChoices.find((row) => row.value === filters.balance)?.label} · issued invoices
            {!filters.date_from && !filters.date_to
              ? " across all invoice dates"
              : " within the selected invoice dates"}
            . Amounts reflect the current ledger, including partial payments, credits and refunds.
          </p>
        )}
        {filters.date_basis === "issued" && (filters.date_from || filters.date_to) && (
          <p className="text-sm text-muted-foreground">
            Invoices issued {filters.date_from ? `from ${dateLabel(filters.date_from)}` : ""}{" "}
            {filters.date_to ? `through ${dateLabel(filters.date_to)}` : ""}. Report payments and
            refunds use their own recorded dates.
          </p>
        )}
        {parsed.success && parsed.data.summary && (
          <div
            aria-label="Filtered invoice totals"
            className="flex flex-wrap gap-x-8 gap-y-4 border-b border-border pb-5"
          >
            {[
              { label: "Outstanding", value: parsed.data.summary.outstanding, Icon: ReceiptText },
              {
                label: "Net payments recorded",
                value: parsed.data.summary.net_received,
                Icon: Wallet,
              },
              {
                label: "Refundable excess",
                value: parsed.data.summary.refundable,
                Icon: CreditCard,
              },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="flex min-w-0 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-soft text-teal-ink">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 font-heading text-xl font-bold">
                    <Money value={value} code={setup.currency} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {patientSearch}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="max-w-prose text-sm text-muted-foreground">
            Totals follow your invoice filters. Record payments and refunds after money moves
            outside Medframe.
          </p>
          {!readOnly && can("billing.manage") && (
            <EntrySheet
              title="New invoice"
              description="Create a draft with consultation or procedure charges."
              triggerVariant="default"
            >
              <InvoiceForm
                setup={setup}
                patientId={patientId}
                saved={(invoice) => router.push(href(`/clinic/billing/${invoice.id}`))}
              />
            </EntrySheet>
          )}
        </div>
        <form
          noValidate
          className="grid min-w-0 items-end gap-4 @min-[700px]:grid-cols-2 @min-[1100px]:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            apply({
              ...(search ? { query: search } : {}),
              ...(status !== "all" ? { status } : {}),
              ...(from ? { date_from: from } : {}),
              ...(to ? { date_to: to } : {}),
              ...(balance !== "all" ? { balance } : {}),
              ...(dateBasis === "issued" ? { date_basis: dateBasis } : {}),
              ...(initialFilters.currency ? { currency: initialFilters.currency } : {}),
            });
          }}
        >
          <FormField id="invoice-search" label="Search invoices">
            <Input
              id="invoice-search"
              type="search"
              maxLength={160}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </FormField>
          <FormSelect
            id="invoice-status"
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              "all",
              "draft",
              "issued",
              "unpaid",
              "partial",
              "paid",
              "refund_due",
              "void",
            ].map((value) => ({
              value,
              label: value === "all" ? "All statuses" : value.replaceAll("_", " "),
            }))}
          />
          <FormSelect
            id="invoice-balance"
            label="Balance timing"
            value={balance}
            onChange={(value) => {
              setBalance(value);
              if (value !== "all") setStatus("issued");
            }}
            options={balanceChoices}
          />
          <FormSelect
            id="invoice-date-basis"
            label="Filter dates by"
            value={dateBasis}
            onChange={setDateBasis}
            options={[
              { value: "created", label: "Invoice created date" },
              { value: "issued", label: "Invoice issued date" },
            ]}
          />
          <FormField
            id="invoice-from"
            label={`${dateBasis === "issued" ? "Issued" : "Created"} from`}
          >
            <DateInput
              id="invoice-from"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </FormField>
          <FormField
            id="invoice-to"
            label={`${dateBasis === "issued" ? "Issued" : "Created"} through`}
          >
            <DateInput id="invoice-to" value={to} onChange={(event) => setTo(event.target.value)} />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="outline">
              Apply filters
            </Button>
            {Object.keys(filters).length > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setStatus("all");
                  setBalance("all");
                  setDateBasis("created");
                  setFrom("");
                  setTo("");
                  apply({});
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </form>
        {!parsed.success ? (
          <LoadState error={remote.error} retry={remote.reload} />
        ) : (
          <>
            <RemoteNotice error={remote.error} retry={remote.reload} />
            {!parsed.data.items.length ? (
              <div className="grid justify-items-start gap-2 rounded-xl border border-dashed border-border px-5 py-9">
                <ReceiptText className="mb-2 size-7 text-teal-ink" />
                <h3 className="font-semibold">No invoices in this view</h3>
                <p className="max-w-prose text-sm text-muted-foreground">
                  Create an invoice or adjust the filters to find an existing statement.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice / patient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due date</TableHead>
                      <TableHead className="text-right">Charge</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.data.items.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <Link
                            className="block font-semibold text-primary underline-offset-4 hover:underline"
                            href={href(`/clinic/billing/${invoice.id}`)}
                          >
                            {invoice.number ?? "Draft invoice"}
                          </Link>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            <PersonIdentity kind="patient" name={invoice.patient_name} /> ·{" "}
                            {invoice.reference}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={invoice.payment_status} />
                        </TableCell>
                        <TableCell>{dateLabel(invoice.due_date)}</TableCell>
                        <TableCell className="text-right">
                          <Money value={invoice.total} />
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <Money value={invoice.outstanding} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <PageNavigation after={after} next={parsed.data.end_cursor} change={setAfter} />
          </>
        )}
      </FinancialSection>
    </div>
  );
}
