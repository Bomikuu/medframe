"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { useEntrySheetActions } from "@/components/application/entry-sheet";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { localDate } from "@/features/operations/schema";
import { invoiceDetailSchema, moneyInput, type InvoiceDetail } from "./schema";
import { useFinancialAction } from "./use-billing";
import { FinancialNotice, Money } from "./controls";

const financialInput = z.object({
  amount: moneyInput,
  payment_id: z.string(),
  method: z.enum(["cash", "bank_transfer", "other"]),
  reference: z.string().max(120),
  reason: z.string().max(500),
  paid_date: z.string().min(1),
  confirmed: z.boolean().refine((value) => value, "Confirm this entry before recording it."),
});
type Values = z.infer<typeof financialInput>;
export function PaymentForm({
  invoice,
  kind,
  saved,
}: {
  invoice: InvoiceDetail;
  kind: "payment" | "refund" | "credit";
  saved: () => void;
}) {
  const action = useFinancialAction();
  const sheet = useEntrySheetActions();
  const { workspace } = useWorkspace();
  const form = useForm<Values>({
    resolver: zodResolver(financialInput),
    defaultValues: {
      amount:
        kind === "payment"
          ? invoice.due
            ? Number(invoice.due.due_now) > 0
              ? invoice.due.due_now
              : (invoice.due.next_due?.remaining ?? invoice.outstanding)
            : invoice.outstanding
          : "",
      payment_id: invoice.payments.find((payment) => Number(payment.refundable) > 0)?.id ?? "",
      method: "cash",
      reference: "",
      reason: "",
      paid_date: localDate(workspace.organization.timezone),
      confirmed: false,
    },
  });
  const values = useWatch({ control: form.control });
  useUnsavedChanges(`financial:${invoice.id}:${kind}`, form.formState.isDirty, () => form.reset());
  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={form.handleSubmit(async (data) => {
        if (
          (kind !== "payment" && !data.reason.trim()) ||
          (kind === "refund" && !data.payment_id)
        ) {
          form.setError(kind === "refund" && !data.payment_id ? "payment_id" : "reason", {
            message: "This field is required.",
          });
          return;
        }
        const { payment_id } = data;
        const rest = {
          amount: data.amount,
          method: data.method,
          reference: data.reference,
          reason: data.reason,
          paid_date: data.paid_date,
        };
        const result = await action.run(kind, {
          ...rest,
          payment_id: kind === "refund" ? payment_id : null,
          id: invoice.id,
          expected_version: invoice.version,
        });
        if (invoiceDetailSchema.safeParse(result).success) {
          form.reset();
          saved();
          sheet?.complete();
        }
      })}
    >
      <div className="grid gap-2 rounded-xl bg-muted/70 p-5 text-sm">
        <p className="font-semibold">
          {invoice.number} · {invoice.patient_name}
        </p>
        <p>
          Outstanding: <Money value={invoice.outstanding} />
        </p>
        {kind === "payment" && invoice.due?.is_installment && (
          <p className="text-muted-foreground">
            {Number(invoice.due.due_now) > 0
              ? `Due through today: PHP ${invoice.due.due_now}`
              : "Nothing is due through today. The suggested amount is an early payment toward the next unpaid installment."}
          </p>
        )}
        <p className="text-muted-foreground">
          {kind === "payment"
            ? "Record money already received by cash, bank transfer or another method. This does not charge an account."
            : kind === "refund"
              ? "Record money already returned outside Medframe. This does not transfer money. A refund reopens the balance unless a separate credit cancels the charge."
              : "Reduce the issued charge without changing the original invoice. A credit may create a refundable balance; it does not return money."}
        </p>
      </div>
      <fieldset disabled={action.busy} className="grid gap-5">
        {kind === "refund" && (
          <FormSelect
            id="refund-payment"
            label="Original payment"
            value={values.payment_id ?? ""}
            error={form.formState.errors.payment_id?.message}
            onChange={(value) => form.setValue("payment_id", value, { shouldDirty: true })}
            options={invoice.payments
              .filter((payment) => Number(payment.refundable) > 0)
              .map((payment) => ({
                value: payment.id,
                label: `${payment.paid_date} · PHP ${payment.amount} · PHP ${payment.refundable} refundable`,
              }))}
          />
        )}
        <div className="max-w-xs">
          <FormField
            id={`financial-amount-${kind}`}
            label="Amount (PHP)"
            error={form.formState.errors.amount?.message}
          >
            <Input
              id={`financial-amount-${kind}`}
              inputMode="decimal"
              {...form.register("amount")}
            />
          </FormField>
        </div>
        {kind === "payment" && (
          <>
            <FormSelect
              id="payment-method"
              label="Payment method"
              value={values.method ?? "cash"}
              onChange={(value) =>
                form.setValue("method", value as Values["method"], { shouldDirty: true })
              }
              options={[
                { value: "cash", label: "Cash" },
                { value: "bank_transfer", label: "Bank transfer" },
                { value: "other", label: "Other" },
              ]}
            />
            <FormField
              id="payment-reference"
              label="Payment reference (optional)"
              error={form.formState.errors.reference?.message}
            >
              <Input id="payment-reference" maxLength={120} {...form.register("reference")} />
            </FormField>
          </>
        )}
        {kind !== "credit" && (
          <div className="max-w-xs">
            <FormField
              id={`financial-date-${kind}`}
              label={kind === "payment" ? "Date received" : "Date returned"}
              error={form.formState.errors.paid_date?.message}
            >
              <Input id={`financial-date-${kind}`} type="date" {...form.register("paid_date")} />
            </FormField>
          </div>
        )}
        {kind !== "payment" && (
          <FormField
            id={`financial-reason-${kind}`}
            label="Reason"
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id={`financial-reason-${kind}`}
              maxLength={500}
              rows={4}
              {...form.register("reason")}
            />
          </FormField>
        )}
        <FormField
          id={`financial-confirm-${kind}`}
          label="Confirm financial entry"
          error={form.formState.errors.confirmed?.message}
        >
          <label
            className="flex min-h-11 items-center gap-3 rounded-lg border border-border p-4 text-sm"
            htmlFor={`financial-confirm-${kind}`}
          >
            <Checkbox
              id={`financial-confirm-${kind}`}
              checked={values.confirmed ?? false}
              onCheckedChange={(value) =>
                form.setValue("confirmed", value === true, { shouldDirty: true })
              }
            />
            <span>
              {kind === "credit"
                ? "I confirm the charge reduction and its reason."
                : kind === "payment"
                  ? "I confirm this money has already been received."
                  : "I confirm this money has already been returned."}
            </span>
          </label>
        </FormField>
      </fieldset>
      <FinancialNotice error={action.error} />
      <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-border bg-card py-4">
        <Button
          type="button"
          variant="outline"
          disabled={action.busy}
          onClick={() => sheet?.cancel()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={action.busy}>
          {action.busy
            ? "Recording…"
            : kind === "payment"
              ? "Record payment"
              : kind === "refund"
                ? "Record refund"
                : "Issue credit"}
        </Button>
      </div>
    </form>
  );
}
