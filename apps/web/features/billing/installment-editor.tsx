"use client";

import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/form-field";
import type { DraftValues } from "./schema";
import { currency } from "./schema";

export function nextMonth(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  const target = new Date(Date.UTC(year, month, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(date, last)).padStart(2, "0")}`;
}
export function InstallmentEditor({
  form,
  today,
  enabled,
  sourceDeposit = "0",
  sourceMonths = 24,
}: {
  form: UseFormReturn<DraftValues>;
  today: string;
  enabled: boolean;
  sourceDeposit?: string;
  sourceMonths?: number;
}) {
  const values = form.watch();
  const plan = values.installment;
  return (
    <section className="grid gap-4 border-t border-border pt-6">
      <label className="flex items-center justify-between gap-4">
        <span className="font-semibold">Monthly installment plan</span>
        <Switch
          checked={!!plan}
          disabled={!enabled}
          onCheckedChange={(checked) =>
            form.setValue(
              "installment",
              checked
                ? {
                    case_id: "",
                    deposit: sourceDeposit,
                    months: sourceMonths,
                    deposit_due: today,
                    first_due: nextMonth(today),
                  }
                : null,
              { shouldDirty: true },
            )
          }
        />
      </label>
      {!enabled && (
        <p className="text-sm text-muted-foreground">
          Choose one service charge of quantity one to offer installments. Other charges need a
          separate invoice.
        </p>
      )}
      {plan && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="plan-deposit"
              label="Down payment (PHP)"
              error={form.formState.errors.installment?.deposit?.message}
            >
              <Input
                id="plan-deposit"
                inputMode="decimal"
                {...form.register("installment.deposit")}
              />
            </FormField>
            <FormField
              id="plan-months"
              label="Number of monthly payments"
              error={form.formState.errors.installment?.months?.message}
            >
              <Input
                id="plan-months"
                type="number"
                min={1}
                max={60}
                {...form.register("installment.months", { valueAsNumber: true })}
              />
            </FormField>
            {Number(plan.deposit) > 0 && (
              <FormField id="plan-deposit-date" label="Down payment due date">
                <Input
                  id="plan-deposit-date"
                  type="date"
                  min={today}
                  {...form.register("installment.deposit_due")}
                />
              </FormField>
            )}
            <FormField
              id="plan-first-date"
              label="First monthly due date"
              error={form.formState.errors.installment?.first_due?.message}
            >
              <Input
                id="plan-first-date"
                type="date"
                min={today}
                {...form.register("installment.first_due")}
              />
            </FormField>
          </div>
          <p className="rounded-lg bg-muted/60 p-4 text-sm leading-6">
            {currency(plan.deposit || "0")} down payment plus {plan.months} monthly installments.
            Save the draft to generate the exact dated schedule, then review it before issue. No
            money is recorded by creating the plan.
          </p>
        </>
      )}
    </section>
  );
}
