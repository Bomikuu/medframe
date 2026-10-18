"use client";

import { PlanItemWork, PlanHistory, AddPlanItem } from "./plan-work";
import { FollowUps } from "./follow-ups";
import { z } from "zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/features/patients/form-controls";
import { useRemote } from "@/features/patients/use-remote";
import { usePatientDraft } from "@/features/patients/use-patient-draft";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { LoadState, failureText } from "@/features/patients/feedback";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { getGraphqlClient } from "@/lib/graphql/client";
import {
  CreateTreatmentPlanDocument,
  TreatmentPlansDocument,
  UpdateTreatmentItemDocument,
  ConsultationsDocument,
} from "@/lib/graphql/generated";
import { draftSchema } from "@/features/consultations/schema";

const planSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    version: z.number(),
    items: z.array(
      z.object({
        id: z.string(),
        description: z.string(),
        position: z.number(),
        status: z.string(),
        tooth: z.string(),
        completed_revision_id: z.string().nullable(),
      }),
    ),
  }),
);

export function TreatmentPlans({ patientId }: { patientId: string }) {
  const { organizationId, can } = useWorkspace();
  const remote = useRemote(TreatmentPlansDocument, { organizationId, patientId });
  const visits = useRemote(ConsultationsDocument, { organizationId, patientId });
  const capture = useRequestScope();
  const [failure, setFailure] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const plans = planSchema.safeParse(remote.data?.treatmentPlans);
  async function change(
    planId: string,
    itemId: string,
    status: string,
    expectedVersion: number,
    completedRevisionId?: string,
  ) {
    const isCurrent = capture();
    setBusy(true);
    setFailure(null);
    try {
      await getGraphqlClient().request(UpdateTreatmentItemDocument, {
        organizationId,
        planId,
        itemId,
        status,
        expectedVersion,
        completedRevisionId,
        requestId: crypto.randomUUID(),
      });
      if (isCurrent()) remote.reload();
    } catch (error) {
      if (isCurrent()) setFailure(error);
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }
  return (
    <section className="grid gap-5">
      <h2 className="text-xl font-semibold">Treatment plans</h2>
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : plans.success ? (
        plans.data.length ? (
          plans.data.map((plan) => (
            <div key={plan.id} data-panel className="rounded-lg border border-border p-5">
              <h3 className="font-semibold">{plan.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {plan.items.filter((item) => item.status === "completed").length} of{" "}
                {plan.items.filter((item) => item.status !== "cancelled").length} active items
                completed
              </p>
              <ol className="mt-4 grid gap-4">
                {plan.items.map((item, index) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4"
                  >
                    <div>
                      <p className="font-medium">
                        {index + 1}. {item.description}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.tooth ? `Tooth ${item.tooth} · ` : ""}
                        {item.status.replaceAll("_", " ")}
                      </p>
                    </div>
                    {can("treatments.write") && (
                      <PlanItemWork
                        key={item.id}
                        plan={plan}
                        item={item}
                        index={index}
                        onSaved={remote.reload}
                      />
                    )}
                    {can("treatments.write") && item.status !== "completed" && (
                      <fieldset disabled={busy} className="grid gap-3">
                        <FormSelect
                          id={`plan-item-${item.id}`}
                          label="Plan status"
                          value={item.status}
                          onChange={(value) => void change(plan.id, item.id, value, plan.version)}
                          options={["proposed", "planned", "in_progress", "cancelled"].map(
                            (value) => ({ value, label: value.replaceAll("_", " ") }),
                          )}
                        />
                        <CompleteTreatmentItem
                          candidates={(visits.data?.encounters ?? [])
                            .filter((encounter) => {
                              const parsed = draftSchema.safeParse(encounter.content);
                              return (
                                ["finalized", "amended"].includes(encounter.status) &&
                                !encounter.isAmendment &&
                                encounter.revisionId &&
                                parsed.success &&
                                parsed.data.procedures.some(
                                  (procedure) =>
                                    procedure.status === "completed" &&
                                    procedure.description === item.description &&
                                    procedure.tooth === item.tooth,
                                )
                              );
                            })
                            .map((encounter) => ({
                              id: encounter.revisionId!,
                              label: `${encounter.reason}, revision ${encounter.latestFinalizedVersion}`,
                            }))}
                          onComplete={(revisionId) =>
                            void change(plan.id, item.id, "completed", plan.version, revisionId)
                          }
                          itemId={item.id}
                        />
                      </fieldset>
                    )}
                  </li>
                ))}
              </ol>
              {can("treatments.write") && (
                <AddPlanItem planId={plan.id} version={plan.version} onSaved={remote.reload} />
              )}
              <PlanHistory
                key={`${plan.id}:${plan.version}`}
                patientId={patientId}
                planId={plan.id}
              />
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No treatment plans recorded.</p>
        )
      ) : (
        <p role="alert">Treatment plans could not be read. Refresh to try again.</p>
      )}
      <p className="text-xs text-muted-foreground">
        Plan progress is separate from clinical evidence. A completed item must link to a matching
        procedure in a finalized visit.
      </p>
      {failure !== null && (
        <p role="alert" className="text-sm text-destructive">
          {failureText(failure)}
        </p>
      )}
      <FollowUps patientId={patientId} plans={plans.success ? plans.data : []} />
      {can("treatments.write") && <PlanForm patientId={patientId} onSaved={remote.reload} />}
    </section>
  );
}

function CompleteTreatmentItem({
  candidates,
  onComplete,
  itemId,
}: {
  candidates: { id: string; label: string }[];
  onComplete: (id: string) => void;
  itemId: string;
}) {
  const [revision, setRevision] = useState("none");
  if (!candidates.length)
    return (
      <p className="max-w-xs text-xs text-muted-foreground">
        Finalize a matching completed procedure to record completion.
      </p>
    );
  return (
    <div className="grid max-w-sm gap-3">
      <FormSelect
        id={`evidence-${itemId}`}
        label="Finalized procedure evidence"
        value={revision}
        onChange={setRevision}
        options={[
          { value: "none", label: "Choose finalized visit" },
          ...candidates.map((item) => ({ value: item.id, label: item.label })),
        ]}
      />
      <Button
        type="button"
        variant="outline"
        disabled={revision === "none"}
        onClick={() => onComplete(revision)}
      >
        Complete plan item
      </Button>
    </div>
  );
}

function PlanForm({ patientId, onSaved }: { patientId: string; onSaved: () => void }) {
  const { organizationId } = useWorkspace();
  const capture = useRequestScope();
  const [failure, setFailure] = useState<unknown>(null);
  const form = useForm({
    defaultValues: {
      title: "",
      requestId: crypto.randomUUID(),
      items: [{ description: "", tooth: "", status: "proposed" }],
    },
  });
  const array = useFieldArray({ control: form.control, name: "items" });
  usePatientDraft(`${organizationId}:${patientId}:treatment-plan`, form);
  useUnsavedChanges(`${organizationId}:${patientId}:treatment-plan`, form.formState.isDirty, () =>
    form.reset(),
  );
  return (
    <details className="rounded-lg border border-border p-5">
      <summary className="min-h-11 font-medium">Create a treatment plan</summary>
      <form
        noValidate
        className="mt-5 grid gap-5"
        onSubmit={form.handleSubmit(async (values) => {
          const isCurrent = capture();
          setFailure(null);
          try {
            await getGraphqlClient().request(CreateTreatmentPlanDocument, {
              organizationId,
              patientId,
              requestId: values.requestId,
              data: { title: values.title, items: values.items },
            });
            if (isCurrent()) {
              form.reset({
                title: "",
                requestId: crypto.randomUUID(),
                items: [{ description: "", tooth: "", status: "proposed" }],
              });
              onSaved();
            }
          } catch (error) {
            if (isCurrent()) setFailure(error);
          }
        })}
      >
        <input type="hidden" {...form.register("requestId")} />
        <FormField id="planTitle" label="Plan title" error={form.formState.errors.title?.message}>
          <Input
            id="planTitle"
            {...form.register("title", { required: "Enter a plan title.", maxLength: 240 })}
            maxLength={240}
          />
        </FormField>
        {array.fields.map((field, index) => (
          <div key={field.id} className="grid gap-4 sm:grid-cols-[1fr_140px_auto]">
            <FormField
              id={`plan-description-${index}`}
              label={`Item ${index + 1}`}
              error={form.formState.errors.items?.[index]?.description?.message}
            >
              <Input
                id={`plan-description-${index}`}
                {...form.register(`items.${index}.description`, {
                  required: "Enter the proposed treatment.",
                  maxLength: 240,
                })}
                maxLength={240}
              />
            </FormField>
            <FormField id={`plan-tooth-${index}`} label="FDI tooth">
              <Input
                id={`plan-tooth-${index}`}
                {...form.register(`items.${index}.tooth`)}
                inputMode="numeric"
                maxLength={2}
              />
            </FormField>
            <Button
              type="button"
              variant="ghost"
              className="self-end"
              disabled={array.fields.length === 1}
              onClick={() => array.remove(index)}
            >
              Remove item
            </Button>
          </div>
        ))}
        {failure !== null && (
          <p role="alert" className="text-sm text-destructive">
            {failureText(failure)}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={array.fields.length >= 30}
            onClick={() => array.append({ description: "", tooth: "", status: "proposed" })}
          >
            Add plan item
          </Button>
          <Button disabled={form.formState.isSubmitting} aria-busy={form.formState.isSubmitting}>
            Create plan
          </Button>
        </div>
      </form>
    </details>
  );
}
