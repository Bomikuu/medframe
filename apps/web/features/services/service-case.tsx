"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EntrySheet } from "@/components/application/entry-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/features/patients/form-controls";
import { LoadState, RemoteNotice, dateLabel } from "@/features/patients/feedback";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { PatientServiceDocument } from "@/lib/graphql/generated";
import { FinancialNotice, Money } from "@/features/billing/controls";
import { useBillingSetup } from "@/features/billing/use-billing";
import { InvoiceForm } from "@/features/billing/invoice-form";
import { useSafety } from "@/features/workspace/safety-provider";
import { caseSchema, type ServiceCase } from "./schema";
import { useServiceAction } from "./use-services";

export function ServiceCaseDetail({ caseId, updated }: { caseId: string; updated: () => void }) {
  const { organizationId, can } = useWorkspace();
  const remote = useRemote(PatientServiceDocument, { organizationId, caseId });
  const parsed = caseSchema.safeParse(remote.data?.patientService);
  const action = useServiceAction("case");
  const { confirm } = useSafety();
  const [reason, setReason] = useState("");
  if (!parsed.success) return <LoadState error={remote.error} retry={remote.reload} />;
  const row = parsed.data;
  async function apply(kind: string, extra: Record<string, unknown> = {}) {
    if (await action.run(kind, { id: row.id, expected_version: row.version, reason, ...extra })) {
      setReason("");
      remote.reload();
      updated();
    }
  }
  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-xl font-semibold">{row.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {row.patient_name} · {row.reference}
        </p>
        <p className="mt-2 text-sm capitalize">Workflow: {row.status}</p>
      </div>
      <RemoteNotice error={remote.error} retry={remote.reload} />
      <FinancialNotice error={action.error} />
      <div className="grid gap-3">
        {row.steps.map((step, index) => (
          <div
            key={step.id}
            className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center"
          >
            <p className="text-sm font-medium">
              {index + 1}. {step.label}
            </p>
            <FormSelect
              id={`case-step-${step.id}`}
              label="Step status"
              value={step.status}
              disabled={!can("services.work") || row.status !== "active" || action.busy}
              onChange={(status) => void apply("step", { step_id: step.id, status })}
              options={[
                { value: "pending", label: "Pending" },
                { value: "in_progress", label: "In progress" },
                { value: "completed", label: "Completed" },
                { value: "skipped", label: "Skipped" },
              ]}
            />
          </div>
        ))}
      </div>
      {can("services.work") && row.status === "active" && (
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Reason for skipping, reopening or cancelling
            <Input
              value={reason}
              maxLength={500}
              placeholder="Required for these changes"
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={
                action.busy || row.steps.some((x) => !["completed", "skipped"].includes(x.status))
              }
              onClick={() => void apply("complete")}
            >
              Complete workflow
            </Button>
            <Button
              variant="outline"
              disabled={action.busy || !reason.trim()}
              onClick={async () => {
                if (
                  await confirm({
                    title: "Cancel this patient service?",
                    description:
                      "Workflow changes will stop. Any invoice remains payable until an authorized financial adjustment is made.",
                    action: "Cancel service",
                  })
                )
                  void apply("cancel");
              }}
            >
              Cancel service
            </Button>
          </div>
        </div>
      )}
      {can("billing.read") && <CaseBilling row={row} />}
      <section className="grid gap-3 border-t border-border pt-5">
        <h3 className="font-semibold">Workflow history</h3>
        {row.events.map((event) => (
          <div key={event.id} className="text-sm">
            <p className="capitalize">
              {event.kind} · {event.status.replaceAll("_", " ")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {event.actor} · {dateLabel(event.created_at)}
            </p>
            {event.reason && <p className="mt-1 text-muted-foreground">{event.reason}</p>}
          </div>
        ))}
      </section>
    </div>
  );
}
function CaseBilling({ row }: { row: ServiceCase }) {
  const { href, can } = useWorkspace();
  const router = useRouter();
  const setup = useBillingSetup(row.branch_id);
  return (
    <section className="grid gap-3 border-t border-border pt-5">
      <h3 className="font-semibold">Billing agreement</h3>
      {row.financial && (
        <p className="text-sm">
          Captured preset: <Money value={row.financial.price} />
          {row.financial.payment_mode === "monthly"
            ? ` · ${row.financial.months} monthly installments`
            : " · Full payment"}
        </p>
      )}
      {row.invoice_id ? (
        <Button asChild variant="outline">
          <Link href={href(`/clinic/billing/${row.invoice_id}`)}>
            Open invoice and payment schedule
          </Link>
        </Button>
      ) : row.status !== "cancelled" &&
        can("billing.manage") &&
        can("services.work") &&
        setup.setup ? (
        <EntrySheet
          title="Prepare service invoice"
          description="Review charges, monthly dates and the final agreement before issuing."
        >
          <InvoiceForm
            setup={setup.setup}
            patientId={row.patient_id}
            serviceCase={row}
            saved={(invoice) => router.push(href(`/clinic/billing/${invoice.id}`))}
          />
        </EntrySheet>
      ) : (
        <p className="text-sm text-muted-foreground">
          No linked installment invoice. Financial staff can prepare the agreement.
        </p>
      )}
    </section>
  );
}
