"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/application/status-badge";
import { usePortal } from "@/features/portal/portal-provider";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState, dateLabel } from "@/features/patients/feedback";
import { getPortalClient } from "@/lib/graphql/portal/client";
import { MyBillingDocument, MyInvoiceDocument } from "@/lib/graphql/portal/generated";
import { invoiceDetailSchema, invoicePageSchema } from "./schema";
import { InvoiceHistory, InvoiceStatement } from "./invoice-detail";
import { Money, PageNavigation } from "./controls";

export function PortalBilling() {
  const { linkId, href } = usePortal();
  const invoice = useSearchParams().get("invoice");
  const [after, setAfter] = useState<string | null>(null);
  const remote = useRemote(
    MyBillingDocument,
    { linkId, after },
    { client: getPortalClient, enabled: !invoice },
  );
  const parsed = invoicePageSchema.safeParse(remote.data?.myBilling);
  if (invoice) return <PortalInvoice invoiceId={invoice} />;
  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-2xl font-semibold">Billing statements</h2>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Issued statements and payments recorded by your clinic. Contact the clinic to make a
          payment or question an entry.
        </p>
      </div>
      {!parsed.success ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : (
        <>
          {!parsed.data.items.length ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No issued statements are available for this patient connection.
            </p>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border">
              {parsed.data.items.map((row) => (
                <article key={row.id} className="grid gap-4 p-5 sm:grid-cols-[1fr_auto]">
                  <div>
                    <Link
                      href={`${href("/portal/billing")}&invoice=${row.id}`}
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {row.number}
                    </Link>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Due {dateLabel(row.due_date)} · {row.branch_name}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:text-right">
                    <StatusBadge value={row.payment_status} />
                    {row.due && (
                      <p className="text-sm">
                        Due through today{" "}
                        <strong>
                          <Money value={row.due.due_now} />
                        </strong>{" "}
                        · Future <Money value={row.due.future} />
                      </p>
                    )}
                    <p className="text-sm">
                      Total outstanding{" "}
                      <strong>
                        <Money value={row.outstanding} />
                      </strong>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
          <PageNavigation after={after} next={parsed.data.end_cursor} change={setAfter} />
        </>
      )}
    </div>
  );
}
function PortalInvoice({ invoiceId }: { invoiceId: string }) {
  const { linkId, href } = usePortal();
  const remote = useRemote(MyInvoiceDocument, { linkId, invoiceId }, { client: getPortalClient });
  const parsed = invoiceDetailSchema.safeParse(remote.data?.myInvoice);
  if (!parsed.success) return <LoadState error={remote.error} retry={remote.reload} />;
  const invoice = parsed.data;
  return (
    <div className="grid gap-6">
      <Button asChild variant="outline" className="w-fit">
        <Link href={href("/portal/billing")}>All statements</Link>
      </Button>
      <div>
        <h2 className="text-2xl font-semibold">{invoice.number}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Due {dateLabel(invoice.due_date)} · {invoice.branch_name}
        </p>
      </div>
      <InvoiceStatement invoice={invoice} />
      <InvoiceHistory invoice={invoice} />
    </div>
  );
}
