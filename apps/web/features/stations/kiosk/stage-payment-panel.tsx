"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/features/patients/form-controls";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState } from "@/features/patients/feedback";
import { BillingInvoicesDocument } from "@/lib/graphql/generated";
import { invoicePageSchema } from "@/features/billing/schema";
import { PageNavigation } from "@/features/billing/controls";
import type { ManageAction, StaffTicket } from "./staff-dialogs";

export function StagePaymentPanel({
  row,
  branchId,
  run,
  onLinked,
}: {
  row: StaffTicket;
  branchId: string;
  run: ManageAction;
  onLinked: (version: number, invoiceId: string, message: string) => void;
}) {
  const { organizationId, can } = useWorkspace();
  const [after, setAfter] = useState<string | null>(null);
  const [selected, setSelected] = useState(row.payment_invoice_id ?? "");
  const [busy, setBusy] = useState(false);
  const remote = useRemote(
    BillingInvoicesDocument,
    { organizationId, branchId, patientId: row.patient_id, filters: { status: "issued" }, after },
    {
      enabled:
        can("billing.read") && !!row.patient_id && ["waiting", "called"].includes(row.status),
    },
  );
  if (!can("billing.read") || !row.patient_id || !["waiting", "called"].includes(row.status))
    return null;
  const parsed = invoicePageSchema.safeParse(remote.data?.billingInvoices);
  return (
    <section
      aria-label="Service invoice"
      className="grid gap-3 rounded-lg border border-border p-4"
    >
      <h3 className="font-semibold">Service invoice</h3>
      <p className="text-sm leading-6 text-muted-foreground">
        Link an issued invoice for this patient. Before-service checks use amounts due through
        today; future installments stay scheduled.
      </p>
      {!parsed.success ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : (
        <>
          <FormSelect
            id="stage-invoice"
            label="Issued invoice"
            value={selected}
            onChange={setSelected}
            options={parsed.data.items
              .filter((invoice) => invoice.state === "issued")
              .map((invoice) => ({
                value: invoice.id,
                label: `${invoice.number} · ${invoice.currency} ${invoice.total}`,
              }))}
          />
          {!parsed.data.items.length && (
            <p className="text-sm text-muted-foreground">
              No issued invoices on this page. Prepare and issue a bill in Billing, then reopen this
              ticket.
            </p>
          )}
          <PageNavigation after={after} next={parsed.data.end_cursor} change={setAfter} />
          <Button
            type="button"
            variant="outline"
            disabled={busy || !selected}
            onClick={async () => {
              setBusy(true);
              try {
                const result = (await run({
                  action: "link_invoice",
                  stage_id: row.id,
                  invoice_id: selected,
                  expected_version: row.version,
                })) as
                  | { ticket?: { version: number; payment_clearance: { message: string } } }
                  | undefined;
                if (result?.ticket)
                  onLinked(
                    result.ticket.version,
                    selected,
                    result.ticket.payment_clearance.message,
                  );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Linking…" : "Link invoice"}
          </Button>
        </>
      )}
    </section>
  );
}
