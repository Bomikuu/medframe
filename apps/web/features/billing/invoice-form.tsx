"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, Trash2, Calculator } from "@/components/icons";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEntrySheetActions } from "@/components/application/entry-sheet";
import { FormSelect } from "@/features/patients/form-controls";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { usePatientDraft } from "@/features/patients/use-patient-draft";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { getGraphqlClient } from "@/lib/graphql/client";
import { BillingPreviewDocument } from "@/lib/graphql/generated";
import { localDate } from "@/features/operations/schema";
import { useRequestScope } from "@/features/patients/use-request-scope";
import {
  draftInput,
  invoiceDetailSchema,
  previewSchema,
  type DraftValues,
  type BillingSetup,
  type InvoiceDetail,
} from "./schema";
import { financialFailure, useFinancialAction } from "./use-billing";
import { FinancialNotice, Money } from "./controls";

export function InvoiceForm({
  setup,
  patientId,
  existing,
  saved,
}: {
  setup: BillingSetup;
  patientId?: string;
  existing?: InvoiceDetail;
  saved: (invoice: InvoiceDetail) => void;
}) {
  const { organizationId } = useWorkspace();
  const sheet = useEntrySheetActions();
  const action = useFinancialAction();
  const capture = useRequestScope();
  const [preview, setPreview] = useState<{
    subtotal: string;
    discount: string;
    total: string;
  } | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const form = useForm<DraftValues>({
    resolver: zodResolver(draftInput),
    defaultValues: {
      patient_id: existing?.patient_id ?? patientId ?? "",
      due_date: existing?.due_date ?? localDate(setup.timezone),
      discount_kind: existing?.discount_kind ?? "fixed",
      discount_value: existing?.discount_value ?? "0",
      lines: existing?.lines.map(({ description, kind, quantity, unit_amount }) => ({
        description,
        kind,
        quantity,
        unit_amount,
      })) ?? [{ description: "", kind: "consultation", quantity: 1, unit_amount: "" }],
    },
  });
  const fields = useFieldArray({ control: form.control, name: "lines" });
  const values = useWatch({ control: form.control });
  const scope = `invoice:${organizationId}:${setup.branch_id}:${existing?.id ?? patientId ?? "new"}`;
  usePatientDraft(scope, form);
  useUnsavedChanges(scope, form.formState.isDirty, () => form.reset());
  const payload = (data: DraftValues) => ({
    ...data,
    branch_id: setup.branch_id,
    id: existing?.id ?? null,
    expected_version: existing?.version ?? 0,
  });
  return (
    <form
      noValidate
      className="grid gap-7"
      onSubmit={form.handleSubmit(async (data) => {
        const result = await action.run("save", payload(data));
        const parsed = invoiceDetailSchema.safeParse(result);
        if (parsed.success) {
          form.reset(data);
          saved(parsed.data);
          sheet?.complete();
        }
      })}
    >
      <fieldset disabled={action.busy} className="grid min-w-0 gap-7">
        <section className="grid gap-4">
          <h3 className="font-semibold">Patient and due date</h3>
          <FormSelect
            id="invoice-patient"
            label="Patient"
            value={values.patient_id ?? ""}
            disabled={!!existing || !!patientId}
            onChange={(value) => form.setValue("patient_id", value, { shouldDirty: true })}
            error={form.formState.errors.patient_id?.message}
            options={[
              ...(existing && !setup.patients.some((patient) => patient.id === existing.patient_id)
                ? [{ value: existing.patient_id, label: existing.patient_name }]
                : []),
              ...(patientId && !setup.patients.some((patient) => patient.id === patientId)
                ? [{ value: patientId, label: "Patient from current record" }]
                : []),
              ...setup.patients.map((patient) => ({
                value: patient.id,
                label: `${patient.name} · ${patient.reference}`,
              })),
            ]}
          />
          <div className="max-w-xs">
            <FormField
              id="invoice-due"
              label="Due date"
              error={form.formState.errors.due_date?.message}
            >
              <Input id="invoice-due" type="date" {...form.register("due_date")} />
            </FormField>
          </div>
        </section>
        <section className="grid gap-5 border-t border-border pt-6">
          <h3 className="font-semibold">Charges</h3>
          {fields.fields.map((row, index) => (
            <div key={row.id} className="grid min-w-0 gap-4 border-b border-border pb-5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold">Charge {index + 1}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove charge ${index + 1}`}
                  disabled={fields.fields.length === 1}
                  onClick={() => {
                    fields.remove(index);
                    setPreview(null);
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
              <FormField
                id={`charge-description-${index}`}
                label="Description"
                error={form.formState.errors.lines?.[index]?.description?.message}
              >
                <Input
                  id={`charge-description-${index}`}
                  maxLength={240}
                  {...form.register(`lines.${index}.description`)}
                />
              </FormField>
              <div className="grid min-w-0 gap-4 @min-[480px]:grid-cols-[1fr_96px_140px]">
                <FormSelect
                  id={`charge-kind-${index}`}
                  label="Charge type"
                  value={values.lines?.[index]?.kind ?? "consultation"}
                  onChange={(value) =>
                    form.setValue(
                      `lines.${index}.kind`,
                      value as "consultation" | "procedure" | "other",
                      { shouldDirty: true },
                    )
                  }
                  options={[
                    { value: "consultation", label: "Consultation" },
                    { value: "procedure", label: "Procedure" },
                    { value: "other", label: "Other" },
                  ]}
                />
                <FormField
                  id={`charge-quantity-${index}`}
                  label="Quantity"
                  error={form.formState.errors.lines?.[index]?.quantity?.message}
                >
                  <Input
                    id={`charge-quantity-${index}`}
                    type="number"
                    min={1}
                    max={999}
                    step={1}
                    {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
                  />
                </FormField>
                <FormField
                  id={`charge-price-${index}`}
                  label="Unit price (PHP)"
                  error={form.formState.errors.lines?.[index]?.unit_amount?.message}
                >
                  <Input
                    id={`charge-price-${index}`}
                    inputMode="decimal"
                    {...form.register(`lines.${index}.unit_amount`)}
                  />
                </FormField>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            disabled={fields.fields.length >= 100}
            onClick={() => {
              fields.append({ description: "", kind: "procedure", quantity: 1, unit_amount: "" });
              setPreview(null);
            }}
          >
            <PlusIcon />
            Add charge
          </Button>
        </section>
        <section className="grid gap-4">
          <h3 className="font-semibold">Discount</h3>
          <div className="grid gap-4 @min-[480px]:grid-cols-2">
            <FormSelect
              id="invoice-discount-kind"
              label="Discount type"
              value={values.discount_kind ?? "fixed"}
              onChange={(value) => {
                form.setValue("discount_kind", value as "fixed" | "percent", { shouldDirty: true });
                setPreview(null);
              }}
              options={[
                { value: "fixed", label: "Fixed amount (PHP)" },
                { value: "percent", label: "Percentage (%)" },
              ]}
            />
            <FormField
              id="invoice-discount"
              label={values.discount_kind === "percent" ? "Discount (%)" : "Discount (PHP)"}
              error={form.formState.errors.discount_value?.message}
            >
              <Input
                id="invoice-discount"
                inputMode="decimal"
                {...form.register("discount_value")}
              />
            </FormField>
          </div>
        </section>
        <div className="grid gap-3 rounded-xl bg-muted/70 p-5">
          <p className="text-sm text-muted-foreground">
            Save a draft first. Issuing preserves its charges and assigns an invoice number.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={previewBusy}
            className="w-fit"
            onClick={form.handleSubmit(async (data) => {
              const current = capture();
              setPreviewBusy(true);
              setPreviewError("");
              try {
                const result = await getGraphqlClient().request(BillingPreviewDocument, {
                  organizationId,
                  data: payload(data),
                });
                if (current()) setPreview(previewSchema.parse(result.billingPreview));
              } catch (error) {
                if (current()) setPreviewError(financialFailure(error));
              } finally {
                if (current()) setPreviewBusy(false);
              }
            })}
          >
            <Calculator />
            {previewBusy ? "Calculating…" : "Calculate on server"}
          </Button>
          {preview && (
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt>Subtotal</dt>
                <dd>
                  <Money value={preview.subtotal} />
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Discount</dt>
                <dd>
                  <Money value={preview.discount} />
                </dd>
              </div>
              <div className="flex justify-between gap-3 font-semibold">
                <dt>Calculated total</dt>
                <dd>
                  <Money value={preview.total} />
                </dd>
              </div>
              <p className="text-xs text-muted-foreground">
                Last calculated preview. Save recalculates using your submitted fields.
              </p>
            </dl>
          )}
          {previewError && <FinancialNotice error={previewError} />}
        </div>
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
          {action.busy ? "Saving draft…" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}
