"use client";

import { useState } from "react";
import { FormSelect } from "@/features/patients/form-controls";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { LoadState, dateLabel } from "@/features/patients/feedback";
import { BillingHistoryDocument } from "@/lib/graphql/generated";
import { Money, PageNavigation } from "./controls";
import { paymentPageSchema, type InvoiceDetail } from "./schema";

export function RefundPaymentPicker({
  invoice,
  value,
  change,
  error,
}: {
  invoice: InvoiceDetail;
  value: string;
  change: (id: string) => void;
  error?: string;
}) {
  const { organizationId } = useWorkspace();
  const [after, setAfter] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
    id: string;
    amount: string;
    refundable: string;
    paid_date: string;
  } | null>(null);
  const remote = useRemote(BillingHistoryDocument, {
    organizationId,
    invoiceId: invoice.id,
    kind: "refundable",
    after,
  });
  const parsed = paymentPageSchema.safeParse(remote.data?.billingHistory);
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Choose the original payment. This list includes eligible payments across the full invoice
        history.
      </p>
      {!parsed.success ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : (
        <>
          <FormSelect
            id="refund-payment"
            label="Original payment"
            value={value}
            error={error}
            onChange={(id) => {
              setSelected(parsed.data.items.find((row) => row.id === id) ?? null);
              change(id);
            }}
            options={[
              ...(selected && !parsed.data.items.some((row) => row.id === selected.id)
                ? [selected]
                : []),
              ...parsed.data.items,
            ].map((payment) => ({
              value: payment.id,
              label: `${dateLabel(payment.paid_date)} · PHP ${payment.amount} · PHP ${payment.refundable} available · ${payment.id.slice(0, 8)}`,
            }))}
          />
          {!parsed.data.items.length && (
            <p className="text-sm text-muted-foreground">
              No eligible payments on this page. Return to the newest entries or reload the invoice
              if it changed.
            </p>
          )}
          <PageNavigation after={after} next={parsed.data.end_cursor} change={setAfter} />
        </>
      )}
      {selected && (
        <p className="text-sm">
          Available from the selected payment:{" "}
          <strong>
            <Money value={selected.refundable} />
          </strong>
        </p>
      )}
    </div>
  );
}
