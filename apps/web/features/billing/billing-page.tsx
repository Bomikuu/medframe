"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReceiptText, Wallet, CreditCard } from "@/components/icons";
import { EntrySheet } from "@/components/application/entry-sheet";
import { StatusBadge } from "@/components/application/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useSafety } from "@/features/workspace/safety-provider";
import { BillingInvoicesDocument } from "@/lib/graphql/generated";
import { useBillingSetup } from "./use-billing";
import { invoicePageSchema, type BillingSetup } from "./schema";
import { FinancialSection, Money, PageNavigation } from "./controls";
import { InvoiceForm } from "./invoice-form";

export function BillingPage() {
  const { can } = useWorkspace();
  if (!can("billing.read"))
    return <p role="alert">Your clinic membership does not have billing access.</p>;
  return <BillingWorkspace />;
}
function BillingWorkspace() {
  const [branch, setBranch] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const remote = useBillingSetup(branch, query);
  const { guard } = useSafety();
  if (!remote.setup) return <LoadState error={remote.error} retry={remote.reload} />;
  return (
    <div className="grid gap-6">
      <PageHeading
        title="Billing"
        description="Issue statements, record payments and keep every financial adjustment traceable."
      />
      <div className="flex min-w-0 flex-wrap items-end gap-5 rounded-xl border border-border bg-card p-5">
        <div className="w-full max-w-xs">
          <FormSelect
            id="billing-branch"
            label="Clinic branch"
            value={remote.setup.branch_id}
            onChange={(value) => void guard(() => setBranch(value))}
            options={remote.setup.branches.map((item) => ({ value: item.id, label: item.name }))}
          />
        </div>
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
      </div>
      <InvoiceCollection key={remote.setup.branch_id} setup={remote.setup} />
    </div>
  );
}
export function InvoiceCollection({
  setup,
  patientId,
}: {
  setup: BillingSetup;
  patientId?: string;
}) {
  const { organizationId, can, href } = useWorkspace();
  const router = useRouter();
  const [after, setAfter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const remote = useRemote(BillingInvoicesDocument, {
    organizationId,
    branchId: setup.branch_id,
    filters,
    after,
    patientId: patientId ?? null,
  });
  const parsed = invoicePageSchema.safeParse(remote.data?.billingInvoices);
  return (
    <div className="grid gap-6">
      {parsed.success && parsed.data.summary && (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Outstanding", value: parsed.data.summary.outstanding, Icon: ReceiptText },
            {
              label: "Net payments recorded",
              value: parsed.data.summary.net_received,
              Icon: Wallet,
            },
            { label: "Refunds due", value: parsed.data.summary.refundable, Icon: CreditCard },
          ].map(({ label, value, Icon }) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-soft text-teal-ink">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 font-heading text-xl font-bold">
                  <Money value={value} />
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <FinancialSection title="Invoices">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="max-w-prose text-sm text-muted-foreground">
            Balances reflect issued invoices in this filtered view. Payments and refunds are
            recorded after money moves outside Medframe.
          </p>
          {can("billing.manage") && (
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
            setAfter(null);
            setFilters({
              ...(search ? { query: search } : {}),
              ...(status !== "all" ? { status } : {}),
              ...(from ? { date_from: from } : {}),
              ...(to ? { date_to: to } : {}),
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
            options={["all", "draft", "unpaid", "partial", "paid", "refund_due", "void"].map(
              (value) => ({
                value,
                label: value === "all" ? "All statuses" : value.replaceAll("_", " "),
              }),
            )}
          />
          <FormField id="invoice-from" label="Created from">
            <Input
              id="invoice-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </FormField>
          <FormField id="invoice-to" label="Created through">
            <Input
              id="invoice-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </FormField>
          <Button type="submit" variant="outline">
            Apply filters
          </Button>
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
                            {invoice.patient_name} · {invoice.reference}
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
