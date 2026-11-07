"use client";

import { PersonIdentity } from "@/components/application/person-identity";

import { useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState, dateLabel } from "@/features/patients/feedback";
import { useClinicTime } from "@/components/application/clinical-locale";
import { getGraphqlClient } from "@/lib/graphql/client";
import { getPortalClient } from "@/lib/graphql/portal/client";
import { BillingPaymentConfirmationDocument } from "@/lib/graphql/generated";
import { MyPaymentConfirmationDocument } from "@/lib/graphql/portal/generated";
import { paymentConfirmationSchema } from "./schema";
import { Money } from "./controls";
import type { LedgerScope } from "./invoice-ledger";

export function PaymentConfirmation({
  invoiceId,
  paymentId,
  scope,
}: {
  invoiceId: string;
  paymentId: string;
  scope: LedgerScope;
}) {
  const staff = useRemote(
    BillingPaymentConfirmationDocument,
    { organizationId: scope.organizationId ?? "", invoiceId, paymentId },
    { enabled: !!scope.organizationId },
  );
  const portal = useRemote(
    MyPaymentConfirmationDocument,
    { linkId: scope.linkId ?? "", invoiceId, paymentId },
    { enabled: !!scope.linkId, client: getPortalClient },
  );
  const remote = scope.linkId ? portal : staff;
  const [printState, setPrintState] = useState<unknown>(null);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState(false);
  const parsed = paymentConfirmationSchema.safeParse(
    printState ??
      (scope.linkId ? portal.data?.myPaymentConfirmation : staff.data?.billingPaymentConfirmation),
  );
  const time = useClinicTime();
  if (!parsed.success || remote.error || error)
    return (
      <LoadState
        error={remote.error ?? (error ? new Error("Confirmation unavailable") : null)}
        retry={() => {
          setError(false);
          setPrintState(null);
          remote.reload();
        }}
      />
    );
  const row = parsed.data;
  return (
    <div className="grid gap-6">
      <div data-payment-confirmation className="grid gap-6 bg-card text-card-foreground">
        <header className="border-b border-border pb-5">
          <h2 className="text-2xl font-semibold">Payment confirmation</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {row.branch_name} · {row.invoice_number}
          </p>
        </header>
        <p className="text-lg font-semibold">
          <PersonIdentity kind="patient" name={row.patient_name} />
        </p>
        {row.invoice_state === "void" && (
          <p className="font-semibold text-destructive">
            Invoice voided. This document preserves the original payment record.
          </p>
        )}
        <dl className="grid gap-4 text-sm">
          <div className="flex justify-between gap-4 text-xl font-semibold">
            <dt>Amount received</dt>
            <dd>
              <Money value={row.payment.amount} code={row.currency} />
            </dd>
          </div>
          {[
            ["Date received", dateLabel(row.payment.paid_date)],
            ["Method", row.payment.method.replaceAll("_", " ")],
            ["Recorded at", time(row.recorded_at)],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          {row.payment.reference && (
            <div>
              <dt className="text-muted-foreground">Payment reference</dt>
              <dd className="mt-1 break-words">{row.payment.reference}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 border-t border-border pt-4">
            <dt>Refunds returned</dt>
            <dd>
              <Money value={row.refunded} code={row.currency} />
            </dd>
          </div>
          <div className="flex justify-between gap-4 font-semibold">
            <dt>Amount retained</dt>
            <dd>
              <Money value={row.retained} code={row.currency} />
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Current invoice balance</dt>
            <dd>
              <Money value={row.outstanding} code={row.currency} />
            </dd>
          </div>
        </dl>
        {!!row.refunds?.length && (
          <section
            aria-label="Returns from this payment"
            className="grid gap-3 border-t border-border pt-5"
          >
            <h3 className="text-sm font-semibold">Returns from this payment</h3>
            <ol className="divide-y divide-border">
              {row.refunds.map((refund) => (
                <li key={refund.id} className="grid gap-1 py-3 text-sm">
                  <p className="flex flex-wrap justify-between gap-2">
                    <span>{dateLabel(refund.paid_date)}</span>
                    <strong className="tabular-nums">
                      <Money value={refund.amount} code={row.currency} />
                    </strong>
                  </p>
                  {refund.reason && (
                    <p className="whitespace-pre-wrap text-muted-foreground">{refund.reason}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Recorded {time(refund.recorded_at)}
                    {refund.actor ? ` · ${refund.actor}` : ""}
                  </p>
                </li>
              ))}
            </ol>
            <p className="text-xs leading-5 text-muted-foreground">
              {row.refunds_truncated ? "Latest 20 refunds shown; totals include all returns. " : ""}
              Each return belongs to this source payment. The return date can differ from the date
              it was recorded.
            </p>
          </section>
        )}
        <footer className="grid gap-2 border-t border-border pt-5 text-xs text-muted-foreground">
          <p className="break-all">Source payment: {row.payment.id}</p>
          <p>
            Invoice version {row.invoice_version}. Refunds and balance reflect the ledger when this
            confirmation is opened or printed. A payment can cover only part of an invoice.
          </p>
          <p>Clinic record confirmation. This is not a tax invoice or a new charge.</p>
        </footer>
      </div>
      <Button
        disabled={printing || remote.loading}
        onClick={async () => {
          setPrinting(true);
          try {
            const current = scope.linkId
              ? (
                  await getPortalClient().request(MyPaymentConfirmationDocument, {
                    linkId: scope.linkId,
                    invoiceId,
                    paymentId,
                  })
                ).myPaymentConfirmation
              : (
                  await getGraphqlClient().request(BillingPaymentConfirmationDocument, {
                    organizationId: scope.organizationId!,
                    invoiceId,
                    paymentId,
                  })
                ).billingPaymentConfirmation;
            const checked = paymentConfirmationSchema.parse(current);
            flushSync(() => setPrintState(checked));
            window.print();
          } catch {
            setError(true);
          } finally {
            setPrinting(false);
          }
        }}
      >
        {printing ? "Preparing confirmation…" : "Print confirmation"}
      </Button>
      <style>{`@media print {
        body * { visibility: hidden !important; }
        body [role="dialog"]:has([data-payment-confirmation]) { position: absolute !important; inset: 0 !important; width: 100% !important; max-width: none !important; height: auto !important; max-height: none !important; transform: none !important; overflow: visible !important; border: 0 !important; box-shadow: none !important; }
        [data-payment-confirmation], [data-payment-confirmation] * { visibility: visible !important; }
        [data-payment-confirmation] { position: absolute; inset: 0; padding: 24px; background: white; color: black; }
      }`}</style>
    </div>
  );
}
