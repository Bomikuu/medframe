"use client";

import { PersonIdentity } from "@/components/application/person-identity";

import { ReasonField } from "@/components/application/reason-field";
import { reasonSuggestions } from "@/lib/reason-suggestions";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { useEntrySheetActions } from "@/components/application/entry-sheet";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { localDate } from "@/features/operations/schema";
import { invoiceDetailSchema, moneyInput, paymentReviewSchema, type InvoiceDetail } from "./schema";
import { useFinancialAction } from "./use-billing";
import { FinancialNotice, Money } from "./controls";
import { RefundPaymentPicker } from "./refund-payment-picker";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState, dateLabel } from "@/features/patients/feedback";
import { BillingPaymentReviewDocument } from "@/lib/graphql/generated";

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
  const { workspace, organizationId } = useWorkspace();
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
      payment_id: "",
      method: "cash",
      reference: "",
      reason: "",
      paid_date: localDate(workspace.organization.timezone),
      confirmed: false,
    },
  });
  const values = useWatch({ control: form.control });
  const reviewRemote = useRemote(
    BillingPaymentReviewDocument,
    {
      organizationId,
      invoiceId: invoice.id,
      expectedVersion: invoice.version,
      amount: values.amount ?? "",
    },
    {
      enabled:
        kind === "payment" &&
        moneyInput.safeParse(values.amount).success &&
        Number(values.amount) > 0,
    },
  );
  const review = paymentReviewSchema.safeParse(reviewRemote.data?.billingPaymentReview);
  const reviewReady = review.success && !reviewRemote.loading && !reviewRemote.error;
  useUnsavedChanges(`financial:${invoice.id}:${kind}`, form.formState.isDirty, () => form.reset());
  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={form.handleSubmit(async (data) => {
        if (kind === "payment" && !reviewReady) return;
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
          {invoice.number} · <PersonIdentity kind="patient" name={invoice.patient_name} />
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
          <RefundPaymentPicker
            invoice={invoice}
            value={values.payment_id ?? ""}
            error={form.formState.errors.payment_id?.message}
            change={(value) => form.setValue("payment_id", value, { shouldDirty: true })}
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
          <Controller
            name="reason"
            control={form.control}
            render={({ field }) => (
              <ReasonField
                id={`financial-reason-${kind}`}
                label="Reason"
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                suggestions={
                  kind === "refund" ? reasonSuggestions.refund : reasonSuggestions.financial
                }
                maxLength={500}
                error={form.formState.errors.reason?.message}
                required
              />
            )}
          />
        )}
        {kind === "payment" && (
          <section
            aria-label="Payment review"
            className="grid gap-4 rounded-xl border border-border bg-muted/40 p-5"
          >
            <h3 className="font-semibold">Review money received</h3>
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Amount received</dt>
                <dd className="font-semibold">
                  <Money
                    value={moneyInput.safeParse(values.amount).success ? values.amount! : "0"}
                  />
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Date received</dt>
                <dd>{values.paid_date ? dateLabel(values.paid_date) : "Choose a date"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Method</dt>
                <dd>{values.method?.replaceAll("_", " ")}</dd>
              </div>
            </dl>
            {!moneyInput.safeParse(values.amount).success || Number(values.amount) <= 0 ? (
              <p className="text-sm text-muted-foreground">
                Enter a positive amount to review its coverage.
              </p>
            ) : !reviewReady || !review.success ? (
              <LoadState error={reviewRemote.error} retry={reviewRemote.reload} />
            ) : (
              <>
                <dl className="grid gap-3 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between gap-4 font-semibold">
                    <dt>Remaining invoice balance</dt>
                    <dd>
                      <Money value={review.data.after.outstanding} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Still due through today</dt>
                    <dd>
                      <Money value={review.data.after.due_now} />
                    </dd>
                  </div>
                </dl>
                <p className="text-sm text-muted-foreground">
                  {review.data.after.next_due
                    ? `Next unpaid: ${dateLabel(review.data.after.next_due.due_date)} · PHP ${review.data.after.next_due.remaining}. Payments cover the earliest unpaid obligations first.`
                    : "This entry would settle the remaining invoice balance."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Preview of invoice version {review.data.invoice_version}. Recording checks the
                  current version again.
                </p>
              </>
            )}
          </section>
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
        <Button type="submit" disabled={action.busy || (kind === "payment" && !reviewReady)}>
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
