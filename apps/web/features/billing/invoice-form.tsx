"use client";

import { DateInput } from "@/components/application/date-input";
import { InvoicePreview } from "./invoice-preview";
import { ReasonField } from "@/components/application/reason-field";
import { reasonSuggestions } from "@/lib/reason-suggestions";

import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
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
  type DraftPreview,
  type DraftValues,
  type BillingSetup,
  type InvoiceDetail,
} from "./schema";
import { financialFailure, useFinancialAction } from "./use-billing";
import { FinancialNotice, Money } from "./controls";
import type { ServiceCase } from "@/features/services/schema";
import { caseSchema } from "@/features/services/schema";
import { useServiceAction } from "@/features/services/use-services";
import { ServicePicker } from "./service-picker";
import { InstallmentEditor, nextMonth } from "./installment-editor";

export function InvoiceForm({
  setup,
  patientId,
  existing,
  serviceCase,
  saved,
}: {
  setup: BillingSetup;
  patientId?: string;
  existing?: InvoiceDetail;
  serviceCase?: ServiceCase;
  saved: (invoice: InvoiceDetail) => void;
}) {
  const { organizationId } = useWorkspace();
  const sheet = useEntrySheetActions();
  const action = useFinancialAction();
  const caseAction = useServiceAction("case");
  const today = localDate(setup.timezone);
  const capture = useRequestScope();
  const [preview, setPreview] = useState<{ data: DraftPreview; fingerprint: string } | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const form = useForm<DraftValues>({
    resolver: zodResolver(draftInput),
    defaultValues: {
      patient_id: existing?.patient_id ?? patientId ?? "",
      due_date: existing?.due_date ?? localDate(setup.timezone),
      discount_kind: existing?.discount_kind ?? "fixed",
      discount_value: existing?.discount_value ?? "0",
      case_id: existing?.case_id ?? serviceCase?.id ?? null,
      installment:
        existing?.installment_plan?.terms ??
        (serviceCase?.financial?.payment_mode === "monthly"
          ? {
              case_id: serviceCase.id,
              deposit: serviceCase.financial.deposit,
              months: serviceCase.financial.months,
              deposit_due: today,
              first_due: nextMonth(today),
            }
          : null),
      lines:
        existing?.lines.map(
          ({
            description,
            kind,
            quantity,
            unit_amount,
            service_id,
            service_version,
            override_reason,
            service_case_id,
          }) => ({
            description,
            kind,
            quantity,
            unit_amount,
            service_id,
            service_version,
            override_reason,
            service_case_id,
          }),
        ) ??
        (serviceCase?.financial
          ? [
              {
                description: serviceCase.name,
                kind: "procedure",
                quantity: 1,
                unit_amount: serviceCase.financial.price,
                service_id: serviceCase.service_id,
                service_case_id: serviceCase.id,
                service_version: serviceCase.service_version,
              },
            ]
          : [{ description: "", kind: "consultation", quantity: 1, unit_amount: "" }]),
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
  const fingerprint = JSON.stringify(form.getValues());
  const currentPreview = preview?.fingerprint === fingerprint ? preview.data : null;
  return (
    <form
      noValidate
      className="grid gap-7"
      onSubmit={form.handleSubmit(async (data) => {
        const capturedLines = data.lines.map((line) => ({ ...line }));
        for (let index = 0; index < capturedLines.length; index++) {
          const line = capturedLines[index];
          if (!line.service_id || line.service_case_id) continue;
          const explicit =
            capturedLines.length === 1 ? data.installment?.case_id || data.case_id : "";
          let caseId = explicit;
          if (!caseId) {
            const created = await caseAction.run("create", {
              service_id: line.service_id,
              service_version: line.service_version,
              patient_id: data.patient_id,
              branch_id: setup.branch_id,
              expected_version: 0,
            });
            const parsedCase = caseSchema.safeParse(created);
            if (!parsedCase.success) return;
            caseId = parsedCase.data.id;
          }
          line.service_case_id = caseId;
          form.setValue(`lines.${index}.service_case_id`, caseId, { shouldDirty: true });
        }
        const linked =
          capturedLines.length === 1 ? capturedLines[0].service_case_id || data.case_id : null;
        const result = await action.run(
          "save",
          payload({
            ...data,
            lines: capturedLines,
            case_id: linked || null,
            installment: data.installment ? { ...data.installment, case_id: linked || "" } : null,
          }),
        );
        const parsed = invoiceDetailSchema.safeParse(result);
        if (parsed.success) {
          form.reset(data);
          saved(parsed.data);
          sheet?.complete();
        }
      })}
    >
      <fieldset disabled={action.busy || caseAction.busy} className="grid min-w-0 gap-7">
        <section className="grid gap-4">
          <h3 className="font-semibold">Patient and due date</h3>
          <FormSelect
            id="invoice-patient"
            label="Patient"
            personKind="patient"
            value={values.patient_id ?? ""}
            disabled={!!existing || !!patientId}
            onChange={(value) => {
              form.setValue("patient_id", value, { shouldDirty: true });
              form.setValue("case_id", null);
              form
                .getValues("lines")
                .forEach((_, index) => form.setValue(`lines.${index}.service_case_id`, null));
              if (form.getValues("installment")) form.setValue("installment.case_id", "");
            }}
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
              <DateInput
                id="invoice-due"
                value={values.due_date ?? ""}
                {...form.register("due_date")}
              />
            </FormField>
          </div>
        </section>
        <section className="grid gap-5 border-t border-border pt-6">
          <h3 className="font-semibold">Charges</h3>
          {!serviceCase && (
            <ServicePicker
              branchId={setup.branch_id}
              onSelect={(service) => {
                const line = {
                  description: service.name,
                  kind: "procedure" as const,
                  quantity: 1,
                  unit_amount: service.price ?? "",
                  service_id: service.id,
                  service_version: service.version,
                };
                if (fields.fields.length === 1 && !form.getValues("lines.0.description"))
                  fields.replace([line]);
                else fields.append(line);
                if (service.payment_mode === "monthly" && form.getValues("lines").length === 1)
                  form.setValue(
                    "installment",
                    {
                      case_id: "",
                      deposit: service.deposit ?? "0",
                      months: service.months ?? 24,
                      deposit_due: today,
                      first_due: nextMonth(today),
                    },
                    { shouldDirty: true },
                  );
                setPreview(null);
              }}
            />
          )}

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
              {values.lines?.[index]?.service_id && (
                <Controller
                  name={`lines.${index}.override_reason`}
                  control={form.control}
                  render={({ field }) => (
                    <ReasonField
                      id={`charge-override-${index}`}
                      label="Reason if agreeing a different price"
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      suggestions={reasonSuggestions.pricing}
                      maxLength={500}
                    />
                  )}
                />
              )}
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
        <InstallmentEditor
          form={form}
          today={today}
          enabled={
            values.lines?.length === 1 &&
            !!values.lines?.[0]?.service_id &&
            values.lines?.[0]?.quantity === 1
          }
          sourceDeposit={serviceCase?.financial?.deposit}
          sourceMonths={serviceCase?.financial?.months}
        />
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
              const calculatedFields = JSON.stringify(form.getValues());
              setPreviewBusy(true);
              setPreviewError("");
              try {
                const result = await getGraphqlClient().request(BillingPreviewDocument, {
                  organizationId,
                  data: {
                    ...payload(data),
                    installment: data.installment
                      ? { ...data.installment, case_id: data.installment.case_id || null }
                      : null,
                  },
                });
                if (current())
                  setPreview({
                    data: previewSchema.parse(result.billingPreview),
                    fingerprint: calculatedFields,
                  });
              } catch (error) {
                if (current()) setPreviewError(financialFailure(error));
              } finally {
                if (current()) setPreviewBusy(false);
              }
            })}
          >
            <Calculator />
            {previewBusy
              ? "Preparing preview…"
              : values.installment
                ? "Preview payment plan"
                : "Preview totals"}
          </Button>
          {currentPreview && <InvoicePreview value={currentPreview} />}
          {preview && !currentPreview && (
            <p role="status" className="text-sm text-warning">
              Details changed. Preview again to review the updated amounts and dates.
            </p>
          )}
          {previewError && <FinancialNotice error={previewError} />}
        </div>
      </fieldset>
      <FinancialNotice error={caseAction.error || action.error} />
      <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-border bg-card py-4">
        <Button
          type="button"
          variant="outline"
          disabled={action.busy || caseAction.busy}
          onClick={() => sheet?.cancel()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={action.busy || caseAction.busy}>
          {action.busy ? "Saving draft…" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}
