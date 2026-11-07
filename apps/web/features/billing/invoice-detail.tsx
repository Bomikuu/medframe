"use client";

import { ReasonField } from "@/components/application/reason-field";
import { reasonSuggestions } from "@/lib/reason-suggestions";

import { AccessRequired } from "@/components/application/access-required";

import Link from "next/link";
import { useState } from "react";
import { EntrySheet } from "@/components/application/entry-sheet";
import { StatusBadge } from "@/components/application/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DueSummary, InstallmentSchedule } from "./installment-schedule";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BillingInvoiceDocument } from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState, PageHeading, RemoteNotice, dateLabel } from "@/features/patients/feedback";
import { InvoiceLedger } from "./invoice-ledger";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety } from "@/features/workspace/safety-provider";
import { invoiceDetailSchema, type InvoiceDetail } from "./schema";
import { FinancialNotice, FinancialSection, Money } from "./controls";
import { useBillingSetup, useFinancialAction } from "./use-billing";
import { InvoiceForm } from "./invoice-form";
import { PaymentForm } from "./payment-form";

export function InvoicePage({ invoiceId }: { invoiceId: string }) {
  const { organizationId, can } = useWorkspace();
  const remote = useRemote(
    BillingInvoiceDocument,
    { organizationId, invoiceId },
    { enabled: can("billing.read") },
  );
  const parsed = invoiceDetailSchema.safeParse(remote.data?.billingInvoice);
  if (!can("billing.read"))
    return (
      <AccessRequired
        title="Billing access required"
        description="Your clinic membership does not have billing access."
      />
    );
  if (!parsed.success) return <LoadState error={remote.error} retry={remote.reload} />;
  return (
    <InvoiceWorkspace
      key={parsed.data.id}
      invoice={parsed.data}
      reload={remote.reload}
      remoteError={remote.error}
    />
  );
}
function InvoiceWorkspace({
  invoice,
  reload,
  remoteError,
}: {
  invoice: InvoiceDetail;
  reload: () => void;
  remoteError: unknown;
}) {
  const { can, href, organizationId } = useWorkspace();
  const { confirm } = useSafety();
  const action = useFinancialAction();
  const setup = useBillingSetup(invoice.branch_id);
  const [voidReason, setVoidReason] = useState("");
  const [acknowledged, setAcknowledged] = useState("");
  const agreementReady =
    !invoice.installment_plan || acknowledged === invoice.installment_plan.digest;
  return (
    <div className="grid gap-6">
      <Link
        href={href("/clinic/billing")}
        className="w-fit text-sm text-primary underline underline-offset-4"
      >
        Back to billing
      </Link>
      <PageHeading
        title={invoice.number ?? "Draft invoice"}
        description={`${invoice.patient_name} · ${invoice.reference} · ${invoice.branch_name}`}
      >
        {invoice.case_id && can("services.read") && can("patients.demographics.read") && (
          <Button asChild variant="outline">
            <Link href={`${href(`/clinic/patients/${invoice.patient_id}`)}&tab=services`}>
              Patient services
            </Link>
          </Button>
        )}
        {invoice.state === "draft" && can("billing.manage") && (
          <Button
            disabled={action.busy || !agreementReady}
            onClick={async () => {
              if (
                await confirm({
                  title: "Issue this invoice?",
                  description:
                    "Charges and discount will be preserved. Later corrections use a credit or refund.",
                  action: "Issue invoice",
                })
              ) {
                if (
                  await action.run("issue", {
                    id: invoice.id,
                    expected_version: invoice.version,
                    agreement_confirmed: !!invoice.installment_plan && agreementReady,
                    agreement_digest: invoice.installment_plan?.digest ?? "",
                  })
                )
                  reload();
              }
            }}
          >
            Issue invoice
          </Button>
        )}
      </PageHeading>
      <RemoteNotice error={remoteError} retry={reload} />
      <FinancialNotice error={action.error} message={action.message} />
      {invoice.state === "draft" && invoice.installment_plan && (
        <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-5 text-sm leading-6">
          <Checkbox
            checked={acknowledged === invoice.installment_plan.digest}
            onCheckedChange={(checked) =>
              setAcknowledged(checked ? (invoice.installment_plan?.digest ?? "") : "")
            }
          />
          <span>
            I have reviewed the patient&apos;s service, total, down payment and complete monthly
            schedule below. Issue confirms these terms and does not record money received.
          </span>
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <StatusBadge value={invoice.payment_status} />
        <span className="text-muted-foreground">
          Due {dateLabel(invoice.due_date)} · {invoice.currency}
        </span>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <InvoiceStatement invoice={invoice} />
        <FinancialSection title={invoice.state === "draft" ? "Draft actions" : "Financial actions"}>
          {invoice.state === "draft" &&
            can("billing.manage") &&
            (setup.setup ? (
              <EntrySheet
                title="Edit invoice draft"
                description="Update charges and dates before issuing."
              >
                <InvoiceForm
                  key={invoice.version}
                  setup={setup.setup}
                  existing={invoice}
                  saved={reload}
                />
              </EntrySheet>
            ) : (
              <LoadState error={setup.error} retry={setup.reload} />
            ))}
          {invoice.state === "issued" && (
            <>
              {can("payments.record") && Number(invoice.outstanding) > 0 && (
                <EntrySheet
                  title="Record payment"
                  description="Record money already received. No account is charged."
                  triggerVariant="default"
                >
                  <PaymentForm
                    key={`payment:${invoice.version}`}
                    invoice={invoice}
                    kind="payment"
                    saved={reload}
                  />
                </EntrySheet>
              )}
              {can("billing.adjust") && (
                <>
                  <EntrySheet
                    title="Issue credit"
                    description="Reduce the charge with an attributed credit note."
                  >
                    <PaymentForm
                      key={`credit:${invoice.version}`}
                      invoice={invoice}
                      kind="credit"
                      saved={reload}
                    />
                  </EntrySheet>
                  {invoice.has_refundable_payments && (
                    <EntrySheet
                      title="Record refund"
                      description="Record money already returned. No money is moved."
                    >
                      <PaymentForm
                        key={`refund:${invoice.version}`}
                        invoice={invoice}
                        kind="refund"
                        saved={reload}
                      />
                    </EntrySheet>
                  )}
                  {!Number(invoice.paid) && !Number(invoice.credits) && (
                    <div className="grid gap-3 border-t border-border pt-4">
                      <ReasonField
                        id="invoice-void-reason"
                        label="Reason for voiding"
                        value={voidReason}
                        onValueChange={setVoidReason}
                        suggestions={reasonSuggestions.void}
                        maxLength={500}
                        required
                      />
                      <Button
                        variant="outline"
                        disabled={action.busy || !voidReason.trim()}
                        onClick={async () => {
                          if (
                            await confirm({
                              title: "Void this invoice?",
                              description:
                                "The original statement and reason will remain in financial history.",
                              action: "Void invoice",
                            })
                          ) {
                            if (
                              await action.run("void", {
                                id: invoice.id,
                                expected_version: invoice.version,
                                reason: voidReason,
                              })
                            )
                              reload();
                          }
                        }}
                      >
                        Void invoice
                      </Button>
                    </div>
                  )}
                </>
              )}
              {can("communications.manage") && (
                <Link
                  className="text-sm text-primary underline underline-offset-4"
                  href={`${href("/clinic/communications")}&patient=${invoice.patient_id}&branch=${invoice.branch_id}`}
                >
                  Manage billing reminders
                </Link>
              )}
            </>
          )}
          {invoice.state === "void" && (
            <p className="text-sm text-muted-foreground">
              This statement is preserved and no longer accepts financial entries.
            </p>
          )}
        </FinancialSection>
      </div>
      <InvoiceLedger invoice={invoice} scope={{ organizationId }} />
    </div>
  );
}
export function InvoiceStatement({ invoice }: { invoice: InvoiceDetail }) {
  return (
    <div className="grid min-w-0 gap-5">
      <FinancialSection title="Statement">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Charge</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lines.map((line, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <span className="block min-w-40 font-medium whitespace-normal">
                      {line.description}
                    </span>
                    <span className="text-xs text-muted-foreground">{line.kind}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                  <TableCell className="text-right">
                    <Money value={line.unit_amount} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money value={line.line_total} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <dl className="ml-auto grid w-full max-w-sm gap-3 text-sm">
          {[
            ["Subtotal", invoice.subtotal],
            ["Discount", invoice.discount],
            [
              invoice.state === "draft"
                ? "Proposed draft total"
                : invoice.state === "void"
                  ? "Original voided charge"
                  : "Issued charge",
              invoice.total,
            ],
            ["Credits", invoice.credits],
            ["Payments recorded", invoice.paid],
            ["Refunds returned", invoice.refunded],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>
                <Money value={value} />
              </dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-border pt-4 text-lg font-semibold">
            <dt>{invoice.state === "draft" ? "Amount due before issue" : "Total outstanding"}</dt>
            <dd>
              <Money value={invoice.outstanding} />
            </dd>
          </div>
          {Number(invoice.refundable) > 0 && (
            <div className="flex justify-between gap-3 font-semibold text-teal-ink">
              <dt>Refund due</dt>
              <dd>
                <Money value={invoice.refundable} />
              </dd>
            </div>
          )}
        </dl>
        {invoice.state === "issued" && (
          <details className="rounded-lg bg-muted/40 p-4 text-xs leading-6 text-muted-foreground">
            <summary className="w-fit cursor-pointer rounded-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring">
              Understand this balance
            </summary>
            <p className="mt-2">
              Issued charge − credits = adjusted charge. Payments − refunds = money retained.
              Outstanding is any adjusted charge still unpaid; refundable excess is money retained
              above that charge. A credit changes the charge, while a refund records money already
              returned. They are separate actions.
            </p>
            <p className="mt-2">
              Due through today and future payments divide the outstanding balance by due date.
              Neither means an automatic charge or a clinic profit figure.
            </p>
          </details>
        )}
        {invoice.state === "draft" && (
          <p className="text-sm text-muted-foreground">
            This is a proposed agreement. No payment is due until the invoice is issued; installment
            dates below are proposed dates.
          </p>
        )}
        {invoice.due && invoice.state === "issued" && !invoice.due.is_installment && (
          <DueSummary due={invoice.due} />
        )}
        <p className="text-xs text-muted-foreground">
          Financial statement in {invoice.currency}. Clinical records are maintained separately.
        </p>
      </FinancialSection>
      {invoice.due && (
        <InstallmentSchedule
          due={invoice.due}
          draft={invoice.state === "draft"}
          state={invoice.state}
        />
      )}
    </div>
  );
}
