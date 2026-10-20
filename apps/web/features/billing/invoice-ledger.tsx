"use client";

import { useState } from "react";
import { EntrySheet } from "@/components/application/entry-sheet";
import { useClinicTime } from "@/components/application/clinical-locale";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState, dateLabel } from "@/features/patients/feedback";
import { BillingHistoryDocument } from "@/lib/graphql/generated";
import { MyInvoiceHistoryDocument } from "@/lib/graphql/portal/generated";
import { getPortalClient } from "@/lib/graphql/portal/client";
import { FinancialSection, Money, PageNavigation } from "./controls";
import { eventPageSchema, paymentPageSchema, type InvoiceDetail } from "./schema";
import { PaymentConfirmation } from "./payment-confirmation";

export type LedgerScope =
  { organizationId: string; linkId?: never } | { linkId: string; organizationId?: never };

export function InvoiceLedger({ invoice, scope }: { invoice: InvoiceDetail; scope: LedgerScope }) {
  return (
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-2">
      <LedgerPage
        key={`payments:${invoice.version}`}
        invoice={invoice}
        scope={scope}
        kind="payments"
      />
      <LedgerPage key={`events:${invoice.version}`} invoice={invoice} scope={scope} kind="events" />
    </div>
  );
}

function LedgerPage({
  invoice,
  scope,
  kind,
}: {
  invoice: InvoiceDetail;
  scope: LedgerScope;
  kind: "payments" | "events";
}) {
  const [after, setAfter] = useState<string | null>(null);
  const time = useClinicTime();
  const staff = useRemote(
    BillingHistoryDocument,
    { organizationId: scope.organizationId ?? "", invoiceId: invoice.id, kind, after },
    { enabled: !!scope.organizationId && !!after },
  );
  const portal = useRemote(
    MyInvoiceHistoryDocument,
    { linkId: scope.linkId ?? "", invoiceId: invoice.id, kind, after },
    { enabled: !!scope.linkId && !!after, client: getPortalClient },
  );
  const remote = scope.linkId ? portal : staff;
  const raw = after
    ? scope.linkId
      ? portal.data?.myInvoiceHistory
      : staff.data?.billingHistory
    : { items: invoice[kind], ...invoice[`${kind}_page`] };
  const payments = kind === "payments" ? paymentPageSchema.safeParse(raw) : null;
  const events = kind === "events" ? eventPageSchema.safeParse(raw) : null;
  const parsed = kind === "payments" ? payments : events;
  return (
    <FinancialSection title={kind === "payments" ? "Recorded payments" : "Financial history"}>
      <p className="text-sm text-muted-foreground">
        Newest first · Up to 20 entries per page. Statement totals include the full ledger.
      </p>
      {!parsed?.success ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : (
        <>
          {!parsed.data.items.length && (
            <p className="py-4 text-sm text-muted-foreground">
              {kind === "payments"
                ? "No payments have been recorded."
                : "No issued financial events yet."}
            </p>
          )}
          <ol className="divide-y divide-border">
            {payments?.success &&
              payments.data.items.map((payment) => (
                <li key={payment.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div>
                    <p className="font-semibold">
                      <Money value={payment.amount} code={invoice.currency} />
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {dateLabel(payment.paid_date)} · {payment.method.replaceAll("_", " ")}
                    </p>
                    {payment.amount !== payment.refundable && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Retained after refunds:{" "}
                        <Money value={payment.refundable} code={invoice.currency} />
                      </p>
                    )}
                  </div>
                  <EntrySheet
                    title="Payment confirmation"
                    trigger="View confirmation"
                    description="A confirmation of money already recorded by the clinic."
                    size="standard"
                  >
                    <PaymentConfirmation
                      invoiceId={invoice.id}
                      paymentId={payment.id}
                      scope={scope}
                    />
                  </EntrySheet>
                </li>
              ))}
            {events?.success &&
              events.data.items.map((event) => (
                <li key={event.id} className="grid gap-2 py-4">
                  <p className="font-medium capitalize">
                    {event.kind}
                    {Number(event.amount) > 0 && (
                      <>
                        {" "}
                        · <Money value={event.amount} code={invoice.currency} />
                      </>
                    )}
                  </p>
                  {event.reason && (
                    <p className="max-w-prose text-sm whitespace-pre-wrap text-muted-foreground">
                      {event.reason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {event.actor && `Recorded by ${event.actor} · `}
                    <time dateTime={event.created_at}>{time(event.created_at)}</time>
                  </p>
                </li>
              ))}
          </ol>
          <PageNavigation after={after} next={parsed.data.end_cursor} change={setAfter} />
        </>
      )}
      {after && !parsed?.success && (
        <button
          type="button"
          className="w-fit text-sm text-primary underline underline-offset-4"
          onClick={() => setAfter(null)}
        >
          Return to newest entries
        </button>
      )}
    </FinancialSection>
  );
}
