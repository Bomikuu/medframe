"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/application/status-badge";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety } from "@/features/workspace/safety-provider";
import { BillingInvoicesDocument, BillingInvoiceDocument } from "@/lib/graphql/generated";
import { invoicePageSchema, invoiceDetailSchema } from "@/features/billing/schema";
import { Money, PageNavigation } from "@/features/billing/controls";
import { PaymentForm } from "@/features/billing/payment-form";
import { useRemote } from "../use-remote";
import { LoadState, RemoteNotice, dateLabel } from "../feedback";

export function PatientPaymentAction({
  patientId,
  branchId,
  updated,
}: {
  patientId: string;
  branchId: string;
  updated: () => void;
}) {
  const { organizationId } = useWorkspace();
  const { guard } = useSafety();
  const [after, setAfter] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const remote = useRemote(BillingInvoicesDocument, {
    organizationId,
    branchId,
    patientId,
    filters: {},
    after,
  });
  const invoice = useRemote(
    BillingInvoiceDocument,
    { organizationId, invoiceId: selected },
    { enabled: !!selected },
  );
  const parsed = invoicePageSchema.safeParse(remote.data?.billingInvoices);
  const detail = invoiceDetailSchema.safeParse(invoice.data?.billingInvoice);
  if (selected)
    return (
      <div className="grid gap-5">
        <Button
          variant="outline"
          className="w-fit"
          onClick={() =>
            void guard(() => {
              setSelected("");
              remote.reload();
            })
          }
        >
          Choose another invoice
        </Button>
        {!detail.success ? (
          <LoadState error={invoice.error} retry={invoice.reload} />
        ) : detail.data.patient_id !== patientId ? (
          <p role="alert">This invoice does not belong to the selected patient.</p>
        ) : detail.data.state !== "issued" || Number(detail.data.outstanding) <= 0 ? (
          <p role="status">This invoice no longer has an issued balance available for payment.</p>
        ) : (
          <>
            <RemoteNotice error={invoice.error} retry={invoice.reload} />
            <PaymentForm
              key={`${detail.data.id}:${detail.data.version}`}
              invoice={detail.data}
              kind="payment"
              saved={() => {
                invoice.reload();
                remote.reload();
                updated();
              }}
            />
          </>
        )}
      </div>
    );
  if (!parsed.success) return <LoadState error={remote.error} retry={remote.reload} />;
  const rows = parsed.data.items.filter(
    (row) => row.state === "issued" && Number(row.outstanding) > 0,
  );
  return (
    <div className="grid gap-4">
      <p className="text-sm leading-6 text-muted-foreground">
        Choose an issued invoice for this patient. Record money already received; this does not
        charge a card or transfer funds.
      </p>
      <RemoteNotice error={remote.error} retry={remote.reload} />
      {!rows.length && (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm">
          No payable invoices on this page. Check other invoice pages or create and issue an invoice
          in Invoices & adjustments.
        </p>
      )}
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4"
        >
          <div>
            <p className="font-semibold">{row.number ?? "Invoice"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {row.branch_name} · Due {dateLabel(row.due_date)}
            </p>
            <p className="mt-2 text-sm">
              <Money value={row.outstanding} code={row.currency} /> outstanding
            </p>
            <span className="mt-2 inline-block">
              <StatusBadge value={row.payment_status} />
            </span>
          </div>
          <Button onClick={() => setSelected(row.id)}>Record payment</Button>
        </div>
      ))}
      <PageNavigation after={after} next={parsed.data.end_cursor} change={setAfter} />
    </div>
  );
}
