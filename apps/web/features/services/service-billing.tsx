"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EntrySheet } from "@/components/application/entry-sheet";
import { StatusBadge } from "@/components/application/status-badge";
import { InvoiceForm } from "@/features/billing/invoice-form";
import { invoiceDetailSchema, type InvoiceDetail } from "@/features/billing/schema";
import { Money } from "@/features/billing/controls";
import { useBillingSetup } from "@/features/billing/use-billing";
import { dateLabel, RemoteNotice } from "@/features/patients/feedback";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { BillingInvoiceDocument } from "@/lib/graphql/generated";
import type { ServiceCase } from "./schema";

/** Financial context stays behind the same permission and invoice owner as Billing. */
export function ServiceBilling({ service }: { service: ServiceCase }) {
  const { can } = useWorkspace();
  if (!can("billing.read")) return null;
  return (
    <section aria-label="Service payments" className="grid gap-4 border-t border-border pt-5">
      <div>
        <h3 className="font-semibold">Payments</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Recorded payments and the service workflow are tracked separately.
        </p>
      </div>
      {service.invoice_id ? (
        <LinkedInvoice invoiceId={service.invoice_id} />
      ) : (
        <PrepareInvoice service={service} />
      )}
    </section>
  );
}

function LinkedInvoice({ invoiceId }: { invoiceId: string }) {
  const { organizationId, href } = useWorkspace();
  const remote = useRemote(BillingInvoiceDocument, { organizationId, invoiceId });
  const parsed = invoiceDetailSchema.safeParse(remote.data?.billingInvoice);
  const invoice = parsed.success ? parsed.data : null;
  return (
    <div className="grid min-w-0 gap-4">
      {invoice ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="font-medium">{invoice.number ?? "Draft invoice"}</span>
            <StatusBadge value={invoice.payment_status} />
          </div>
          <RemoteNotice error={remote.error} retry={remote.reload} />
          {invoice.state === "draft" ? (
            <div className="grid gap-2 rounded-lg bg-muted/50 p-4 text-sm">
              <p>
                Proposed total:{" "}
                <strong>
                  <Money value={invoice.total} code={invoice.currency} />
                </strong>
              </p>
              <p className="text-muted-foreground">
                Review the invoice and payment dates before issue. This draft has no payments due.
              </p>
            </div>
          ) : (
            <PaymentContext invoice={invoice} />
          )}
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {remote.loading
                ? "Refreshing payment details…"
                : "Refreshes when you return to this window."}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={remote.loading}
              onClick={remote.reload}
            >
              Refresh
            </Button>
          </div>
        </>
      ) : !remote.data && !remote.error ? (
        <div role="status" aria-label="Loading recorded payments" className="grid gap-3">
          <p className="text-sm text-muted-foreground">Loading recorded payments and due dates…</p>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
      ) : (
        <div role="alert" className="grid gap-3 rounded-lg border border-border p-4 text-sm">
          <p>Payment details could not be read. Retry or open the invoice to check your access.</p>
          <Button type="button" variant="outline" className="w-fit" onClick={remote.reload}>
            Retry payment details
          </Button>
        </div>
      )}
      <Button asChild className="w-full sm:w-fit">
        <Link href={href(`/clinic/billing/${invoiceId}`)}>
          {invoice?.state === "draft" ? "Review invoice" : "Manage payments"}
        </Link>
      </Button>
    </div>
  );
}

function PaymentContext({ invoice }: { invoice: InvoiceDetail }) {
  const next = invoice.state === "issued" ? invoice.due?.next_due : null;
  return (
    <div className="grid min-w-0 gap-4">
      {invoice.state === "void" && (
        <p className="rounded-lg bg-muted/50 p-4 text-sm">
          This invoice is voided. The original agreement is retained for history; no payment is due.
        </p>
      )}
      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
        {[
          ["Payments recorded", invoice.paid],
          ["Refunds returned", invoice.refunded],
          ["Received after refunds", invoice.net_received],
          ["Total outstanding", invoice.outstanding],
          ["Due through today", invoice.due?.due_now],
          ["Future payments", invoice.due?.future],
        ].map(([label, amount]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1.5 font-semibold">
              {amount !== undefined ? (
                <Money value={amount} code={invoice.currency} />
              ) : (
                "Unavailable"
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div className="rounded-lg bg-muted/50 p-4 text-sm">
        <p className="font-medium">{next ? "Next unpaid payment" : "No payments due"}</p>
        {next && (
          <p className="mt-1">
            <Money value={next.remaining} code={invoice.currency} /> · {dateLabel(next.due_date)}
            {next.date_state === "overdue" && (
              <span className="ml-2 font-medium text-destructive">Overdue</span>
            )}
          </p>
        )}
        {Number(invoice.refundable) > 0 && (
          <p className="mt-2 text-muted-foreground">
            <Money value={invoice.refundable} code={invoice.currency} /> is available for refund
            review on the invoice.
          </p>
        )}
      </div>
    </div>
  );
}

function PrepareInvoice({ service }: { service: ServiceCase }) {
  const { can } = useWorkspace();
  return (
    <div className="grid gap-3">
      {service.financial && (
        <p className="text-sm text-muted-foreground">
          Captured service preset: <Money value={service.financial.price} />
          {service.financial.payment_mode === "monthly"
            ? ` · ${service.financial.months} monthly installments`
            : " · Full payment"}
          . No invoice has been prepared.
        </p>
      )}
      {service.status !== "cancelled" && can("billing.manage") && can("services.work") ? (
        <InvoiceBuilder service={service} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Financial staff can prepare the agreement when appropriate.
        </p>
      )}
    </div>
  );
}

function InvoiceBuilder({ service }: { service: ServiceCase }) {
  const { href } = useWorkspace();
  const router = useRouter();
  const setup = useBillingSetup(service.branch_id);
  if (!setup.setup)
    return (
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          {setup.error ? "Invoice setup is unavailable." : "Loading permitted invoice details…"}
        </p>
        <RemoteNotice error={setup.error} retry={setup.reload} />
      </div>
    );
  return (
    <EntrySheet
      title="Prepare service invoice"
      description="Review charges, monthly dates and the final agreement before issuing."
    >
      <InvoiceForm
        setup={setup.setup}
        patientId={service.patient_id}
        serviceCase={service}
        saved={(invoice) => router.push(href(`/clinic/billing/${invoice.id}`))}
      />
    </EntrySheet>
  );
}
