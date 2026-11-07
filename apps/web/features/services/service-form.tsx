"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { useEntrySheetActions } from "@/components/application/entry-sheet";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { moneyInput, currency } from "@/features/billing/schema";
import { FinancialNotice } from "@/features/billing/controls";
import { serviceInput, serviceSchema, type Service, type ServiceValues } from "./schema";
import { useServiceAction } from "./use-services";
import { WorkflowFields } from "./workflow-fields";

export function ServiceForm({
  service,
  branches,
  branchId,
  saved,
}: {
  service?: Service;
  branches: { id: string; name: string }[];
  branchId: string;
  saved: () => void;
}) {
  const action = useServiceAction("catalog");
  const sheet = useEntrySheetActions();
  const form = useForm<ServiceValues>({
    resolver: zodResolver(serviceInput),
    defaultValues: {
      name: service?.name ?? "",
      category: service?.category ?? "",
      description: service?.description ?? "",
      branch_ids: service?.branch_ids ?? [branchId],
      active: service?.active ?? true,
      price: service?.price ?? "",
      workflow: service?.workflow.map((label) => ({ label })) ?? [],
      payment_mode: service?.payment_mode ?? "full",
      deposit: service?.deposit ?? "0",
      months: service?.months ?? 24,
    },
  });
  const values = useWatch({ control: form.control });
  useUnsavedChanges(`service-definition:${service?.id ?? "new"}`, form.formState.isDirty, () =>
    form.reset(),
  );
  const validPreset =
    moneyInput.safeParse(values.price).success &&
    moneyInput.safeParse(values.deposit).success &&
    Number.isInteger(values.months) &&
    Number(values.months) >= 1 &&
    Number(values.months) <= 60;
  const principal =
    Math.round(Number(values.price || 0) * 100) - Math.round(Number(values.deposit || 0) * 100);
  const count = values.months || 1;
  const regular = Math.floor(principal / count);
  const final = regular + (principal % count);
  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={form.handleSubmit(async (data) => {
        const result = await action.run("save", {
          ...data,
          workflow: data.workflow.map((x) => x.label),
          deposit: data.payment_mode === "full" ? "0" : data.deposit,
          months: data.payment_mode === "full" ? 1 : data.months,
          id: service?.id ?? null,
          expected_version: service?.version ?? 0,
        });
        if (serviceSchema.safeParse(result).success) {
          form.reset(data);
          saved();
          sheet?.complete();
        }
      })}
    >
      <fieldset disabled={action.busy} className="grid min-w-0 gap-6">
        <section className="grid gap-4">
          <h3 className="font-semibold">Service details</h3>
          <FormField
            id="service-name"
            label="Service name"
            error={form.formState.errors.name?.message}
          >
            <Input id="service-name" maxLength={160} {...form.register("name")} />
          </FormField>
          <FormField
            id="service-category"
            label="Category"
            error={form.formState.errors.category?.message}
          >
            <Input
              id="service-category"
              maxLength={80}
              placeholder="For example, Orthodontics"
              {...form.register("category")}
            />
          </FormField>
          <FormField id="service-description" label="Description (optional)">
            <Textarea
              id="service-description"
              rows={3}
              maxLength={1200}
              {...form.register("description")}
            />
          </FormField>
          <fieldset className="grid gap-3">
            <legend className="mb-3 text-sm font-medium">Available branches</legend>
            {branches.map((branch) => (
              <label key={branch.id} className="flex items-center justify-between gap-4 text-sm">
                <span>{branch.name}</span>
                <Switch
                  aria-label={`Available at ${branch.name}`}
                  checked={values.branch_ids?.includes(branch.id) ?? false}
                  onCheckedChange={(checked) =>
                    form.setValue(
                      "branch_ids",
                      checked
                        ? [...(values.branch_ids ?? []), branch.id]
                        : (values.branch_ids ?? []).filter((id) => id !== branch.id),
                      { shouldDirty: true },
                    )
                  }
                />
              </label>
            ))}
            {form.formState.errors.branch_ids && (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.branch_ids.message}
              </p>
            )}
          </fieldset>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>Available for new patients</span>
            <Switch
              checked={values.active ?? true}
              onCheckedChange={(value) => form.setValue("active", value, { shouldDirty: true })}
            />
          </label>
        </section>
        <WorkflowFields form={form} />
        <section className="grid gap-4 border-t border-border pt-6">
          <h3 className="font-semibold">Price and payment preset</h3>
          <p className="text-xs leading-5 text-muted-foreground">
            {service
              ? `Editing catalog version ${service.version}. These changes apply to newly assigned services; existing patient services keep their captured version, workflow and price. Issued invoices keep their agreed terms.`
              : "A patient service captures this preset when assigned. Its invoice is reviewed separately before any amount becomes due."}
          </p>
          <div className="max-w-xs">
            <FormField
              id="service-price"
              label="Total price (PHP)"
              error={form.formState.errors.price?.message}
            >
              <Input id="service-price" inputMode="decimal" {...form.register("price")} />
            </FormField>
          </div>
          <FormSelect
            id="service-payment-mode"
            label="Payment arrangement"
            value={values.payment_mode ?? "full"}
            onChange={(value) =>
              form.setValue("payment_mode", value as "full" | "monthly", { shouldDirty: true })
            }
            options={[
              { value: "full", label: "Full payment" },
              { value: "monthly", label: "Monthly installments" },
            ]}
          />
          {values.payment_mode === "monthly" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="service-deposit"
                  label="Down payment (PHP)"
                  error={form.formState.errors.deposit?.message}
                >
                  <Input id="service-deposit" inputMode="decimal" {...form.register("deposit")} />
                </FormField>
                <FormField
                  id="service-months"
                  label="Monthly installments"
                  error={form.formState.errors.months?.message}
                >
                  <Input
                    id="service-months"
                    type="number"
                    min={1}
                    max={60}
                    {...form.register("months", { valueAsNumber: true })}
                  />
                </FormField>
              </div>
              <div className="grid gap-3 rounded-lg bg-muted/40 p-4 text-sm leading-6">
                <h4 className="font-semibold">Illustrative payment breakdown</h4>
                {validPreset && principal >= count ? (
                  <dl className="grid gap-2">
                    {[
                      ["Service total", values.price || "0"],
                      ["Down payment", values.deposit || "0"],
                      ["Amount split monthly", (principal / 100).toFixed(2)],
                      ...(count > 1
                        ? [[`${count - 1} monthly payments, each`, (regular / 100).toFixed(2)]]
                        : []),
                      ["Final monthly payment", (final / 100).toFixed(2)],
                    ].map(([label, amount]) => (
                      <div key={label} className="flex flex-wrap justify-between gap-2">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="font-medium tabular-nums">{currency(amount)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p>
                    Enter a valid price and down payment that leave at least one cent per monthly
                    payment.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  The final payment receives leftover cents. Patient invoice review chooses the
                  dates and shows the exact agreement before issue. Saving a preset never records a
                  payment.
                </p>
              </div>
            </>
          )}
        </section>
      </fieldset>
      <FinancialNotice error={action.error} />
      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-card py-4">
        <Button
          type="button"
          variant="outline"
          disabled={action.busy}
          onClick={() => sheet?.cancel()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={action.busy}>
          {action.busy ? "Saving…" : "Save service"}
        </Button>
      </div>
    </form>
  );
}
