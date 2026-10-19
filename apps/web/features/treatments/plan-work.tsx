"use client";
import { useClinicTime } from "@/components/application/clinical-locale";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AddPlanItemDocument,
  EditTreatmentItemDocument,
  ReorderTreatmentPlanDocument,
  PlanRevisionsDocument,
} from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadState, failureText } from "@/features/patients/feedback";
import { recordPage } from "@/features/records/schema";
import { PageControls } from "@/features/records/record-filters";

type Item = { id: string; description: string; tooth: string; status: string };
export function PlanItemWork({
  plan,
  item,
  index,
  onSaved,
}: {
  plan: { id: string; version: number; items: Item[] };
  item: Item;
  index: number;
  onSaved: () => void;
}) {
  const { organizationId } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const capture = useRequestScope();
  const form = useForm({
    defaultValues: {
      description: item.description,
      tooth: item.tooth,
      requestId: crypto.randomUUID(),
      version: plan.version,
    },
  });
  useEffect(() => {
    if (!form.formState.isDirty)
      form.reset({
        description: item.description,
        tooth: item.tooth,
        version: plan.version,
        requestId: crypto.randomUUID(),
      });
  }, [plan.version, item.description, item.tooth, form, form.formState.isDirty]);
  useUnsavedChanges(`plan-item:${item.id}`, form.formState.isDirty, () => form.reset());
  async function move(delta: number) {
    const current = capture();
    setBusy(true);
    setError(null);
    const ids = plan.items.map((value) => value.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    try {
      await getGraphqlClient().request(ReorderTreatmentPlanDocument, {
        organizationId,
        planId: plan.id,
        itemIds: ids,
        expectedVersion: plan.version,
        requestId: crypto.randomUUID(),
      });
      if (current()) onSaved();
    } catch (failure) {
      if (current()) setError(failure);
    } finally {
      if (current()) setBusy(false);
    }
  }
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          aria-label={`Move ${item.description} earlier`}
          disabled={busy || form.formState.isDirty || index === 0}
          onClick={() => void move(-1)}
        >
          Move earlier
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-label={`Move ${item.description} later`}
          disabled={busy || form.formState.isDirty || index === plan.items.length - 1}
          onClick={() => void move(1)}
        >
          Move later
        </Button>
      </div>
      {item.status !== "completed" && (
        <details>
          <summary className="min-h-11 text-sm font-medium">Edit proposed treatment</summary>
          <form
            noValidate
            className="grid gap-3"
            onSubmit={form.handleSubmit(async (values) => {
              const current = capture();
              setError(null);
              try {
                const result = await getGraphqlClient().request(EditTreatmentItemDocument, {
                  organizationId,
                  planId: plan.id,
                  itemId: item.id,
                  data: {
                    description: values.description,
                    tooth: values.tooth,
                    status: item.status,
                  },
                  expectedVersion: values.version,
                  requestId: values.requestId,
                });
                if (current()) {
                  form.reset({
                    ...values,
                    version: z.object({ version: z.number() }).parse(result.editTreatmentItem)
                      .version,
                    requestId: crypto.randomUUID(),
                  });
                  onSaved();
                }
              } catch (failure) {
                if (current()) setError(failure);
              }
            })}
          >
            <FormField
              id={`edit-item-${item.id}`}
              label="Treatment description"
              error={form.formState.errors.description?.message}
            >
              <Input
                id={`edit-item-${item.id}`}
                maxLength={240}
                {...form.register("description", { required: "Enter a treatment description." })}
              />
            </FormField>
            <FormField id={`edit-tooth-${item.id}`} label="FDI tooth">
              <Input
                id={`edit-tooth-${item.id}`}
                className="max-w-32"
                maxLength={2}
                inputMode="numeric"
                {...form.register("tooth")}
              />
            </FormField>
            <Button disabled={form.formState.isSubmitting}>Save item changes</Button>
          </form>
        </details>
      )}
      {error !== null && <p role="alert">{failureText(error)}</p>}
    </div>
  );
}
const revisionSchema = z.object({
  id: z.string(),
  version: z.number(),
  author: z.string(),
  created_at: z.string(),
  provenance: z.string(),
  snapshot: z.object({
    title: z.string(),
    completed: z.number(),
    active_total: z.number(),
    items: z.array(
      z.object({ id: z.string(), description: z.string(), status: z.string(), tooth: z.string() }),
    ),
  }),
});
export function PlanHistory({ patientId, planId }: { patientId: string; planId: string }) {
  const timeLabel = useClinicTime();
  const { organizationId } = useWorkspace();
  const [after, setAfter] = useState<string>();
  const remote = useRemote(PlanRevisionsDocument, { organizationId, patientId, planId, after });
  const parsed = recordPage(revisionSchema).safeParse(remote.data?.planRevisions);
  return (
    <details className="mt-5 border-t border-border pt-4">
      <summary className="min-h-11 font-medium">Preserved plan versions</summary>
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : parsed.success ? (
        <>
          {parsed.data.items.map((item) => (
            <article key={item.id} className="mt-4 border-t border-border py-4">
              <h4 className="font-medium">
                Version {item.version} · {item.author}
              </h4>
              <p className="text-xs text-muted-foreground">
                {timeLabel(item.created_at)}
                {item.provenance === "migration_snapshot" &&
                  " · Captured when plan history was introduced"}
              </p>
              <p className="mt-2 text-sm">
                {item.snapshot.completed} of {item.snapshot.active_total} active items completed
              </p>
              <ol className="mt-2 list-inside list-decimal text-sm">
                {item.snapshot.items.map((value) => (
                  <li key={value.id}>
                    {value.description} {value.tooth && `(tooth ${value.tooth})`} ·{" "}
                    {value.status.replaceAll("_", " ")}
                  </li>
                ))}
              </ol>
            </article>
          ))}
          <PageControls after={after} next={parsed.data.end_cursor} onChange={setAfter} />
        </>
      ) : (
        <p role="alert">Plan history could not be read.</p>
      )}
    </details>
  );
}

export function AddPlanItem({
  planId,
  version,
  onSaved,
}: {
  planId: string;
  version: number;
  onSaved: () => void;
}) {
  const { organizationId } = useWorkspace();
  const capture = useRequestScope();
  const [error, setError] = useState<unknown>(null);
  const form = useForm({
    defaultValues: { description: "", tooth: "", requestId: crypto.randomUUID(), version },
  });
  useEffect(() => {
    if (!form.formState.isDirty)
      form.reset({ description: "", tooth: "", requestId: crypto.randomUUID(), version });
  }, [version, form, form.formState.isDirty]);
  useUnsavedChanges(`add-plan-item:${planId}`, form.formState.isDirty, () => form.reset());
  return (
    <details className="mt-5 border-t border-border pt-4">
      <summary className="min-h-11 font-medium">Add proposed treatment</summary>
      <form
        noValidate
        className="grid gap-4 @[640px]:grid-cols-[minmax(0,1fr)_120px_auto]"
        onSubmit={form.handleSubmit(async (values) => {
          const current = capture();
          setError(null);
          try {
            const result = await getGraphqlClient().request(AddPlanItemDocument, {
              organizationId,
              planId,
              data: { description: values.description, tooth: values.tooth, status: "proposed" },
              expectedVersion: values.version,
              requestId: values.requestId,
            });
            if (current()) {
              const updated = z.object({ version: z.number() }).parse(result.addTreatmentItem);
              form.reset({
                description: "",
                tooth: "",
                requestId: crypto.randomUUID(),
                version: updated.version,
              });
              onSaved();
            }
          } catch (failure) {
            if (current()) setError(failure);
          }
        })}
      >
        <FormField
          id={`add-plan-description-${planId}`}
          label="Treatment description"
          error={form.formState.errors.description?.message}
        >
          <Input
            id={`add-plan-description-${planId}`}
            maxLength={240}
            {...form.register("description", { required: "Enter proposed treatment." })}
          />
        </FormField>
        <FormField id={`add-plan-tooth-${planId}`} label="FDI tooth">
          <Input
            id={`add-plan-tooth-${planId}`}
            inputMode="numeric"
            maxLength={2}
            {...form.register("tooth")}
          />
        </FormField>
        <Button className="self-end" disabled={form.formState.isSubmitting}>
          Add plan item
        </Button>
        {error !== null && (
          <p role="alert" className="sm:col-span-3">
            {failureText(error)}
          </p>
        )}
      </form>
    </details>
  );
}
