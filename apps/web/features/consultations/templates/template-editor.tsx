"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  ConsultationTemplatesDocument,
  SaveConsultationTemplateDocument,
} from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { FormSelect } from "@/features/patients/form-controls";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeading, LoadState, failureText } from "@/features/patients/feedback";
import { recordPage } from "@/features/records/schema";
import { PageControls } from "@/features/records/record-filters";
import { templateSchema } from "./schema";

const empty = {
  id: "",
  name: "",
  specialty: "other",
  prompts: { subjective: "", objective: "", assessment: "", plan: "" },
  labels: "",
  active: true,
  version: 0,
  requestId: "",
};
export function TemplateEditor() {
  const { organizationId, can } = useWorkspace();
  const [after, setAfter] = useState<string>();
  const remote = useRemote(ConsultationTemplatesDocument, {
    organizationId,
    includeArchived: true,
    after,
  });
  const form = useForm({ defaultValues: { ...empty, requestId: crypto.randomUUID() } });
  const watchedForm = useWatch({ control: form.control });
  const capture = useRequestScope();
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState("");
  const parsed = recordPage(templateSchema).safeParse(remote.data?.consultationTemplates);
  useUnsavedChanges(`template:${organizationId}`, form.formState.isDirty, () => form.reset());
  if (!can("encounters.write")) return <p>Template editing requires clinical authoring access.</p>;
  return (
    <div className="grid max-w-4xl gap-6">
      <PageHeading
        title="Consultation templates"
        description="Reusable prompts guide clinician-authored notes. Patient facts are never copied into templates."
      />
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : parsed.success ? (
        <>
          <ul className="grid gap-3">
            {parsed.data.items.map((item) => (
              <li
                key={item.revision_id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"
              >
                <span>
                  {item.name} · v{item.version}
                  {!item.active && " · Archived"}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={form.formState.isDirty}
                  onClick={() => {
                    form.reset({
                      ...item,
                      labels: item.observation_labels.join("\n"),
                      requestId: crypto.randomUUID(),
                    });
                    setSaved("");
                  }}
                >
                  Edit template
                </Button>
              </li>
            ))}
          </ul>
          <PageControls after={after} next={parsed.data.end_cursor} onChange={setAfter} />
        </>
      ) : (
        <p role="alert">Templates could not be read.</p>
      )}
      <form
        noValidate
        className="grid gap-5 border-t border-border pt-6"
        onSubmit={form.handleSubmit(async (values) => {
          const current = capture();
          setError(null);
          setSaved("");
          try {
            const result = await getGraphqlClient().request(SaveConsultationTemplateDocument, {
              organizationId,
              expectedVersion: values.version,
              requestId: values.requestId,
              data: {
                ...(values.id ? { id: values.id } : {}),
                name: values.name,
                specialty: values.specialty,
                prompts: values.prompts,
                observation_labels: values.labels
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean),
                active: values.active,
              },
            });
            if (current()) {
              const item = templateSchema.parse(result.saveConsultationTemplate);
              form.reset({
                ...item,
                labels: item.observation_labels.join("\n"),
                requestId: crypto.randomUUID(),
              });
              setSaved("Template version saved.");
              remote.reload();
            }
          } catch (failure) {
            if (current()) setError(failure);
          }
        })}
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <FormField
            id="template-name"
            label="Template name"
            error={form.formState.errors.name?.message}
          >
            <Input
              id="template-name"
              maxLength={120}
              {...form.register("name", { required: "Enter a template name." })}
            />
          </FormField>
          <FormSelect
            id="template-specialty"
            label="Specialty"
            value={watchedForm.specialty ?? ""}
            onChange={(value) => form.setValue("specialty", value, { shouldDirty: true })}
            options={[
              { value: "other", label: "Other" },
              { value: "dentistry", label: "Dentistry" },
              { value: "general_medicine", label: "General medicine" },
            ]}
          />
        </div>
        {(["subjective", "objective", "assessment", "plan"] as const).map((section) => (
          <FormField
            key={section}
            id={`prompt-${section}`}
            label={`${section[0].toUpperCase()}${section.slice(1)} prompt`}
          >
            <Textarea
              className="min-h-32 resize-none"
              id={`prompt-${section}`}
              maxLength={1000}
              rows={3}
              {...form.register(`prompts.${section}`)}
            />
          </FormField>
        ))}
        <FormField
          id="template-labels"
          label="Optional observation labels"
          hint="One label per line; up to 20 labels of 120 characters. No measured values."
        >
          <Textarea
            className="min-h-32 resize-none"
            id="template-labels"
            rows={3}
            {...form.register("labels")}
          />
        </FormField>
        {watchedForm.id && (
          <FormSelect
            id="template-active"
            label="Availability"
            value={watchedForm.active ? "active" : "archived"}
            onChange={(value) => form.setValue("active", value === "active", { shouldDirty: true })}
            options={[
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ]}
          />
        )}
        {error !== null && <p role="alert">{failureText(error)}</p>}
        {saved && <p role="status">{saved}</p>}
        <div className="flex gap-3">
          <Button disabled={form.formState.isSubmitting}>Save template version</Button>
          <Button
            type="button"
            variant="outline"
            disabled={form.formState.isDirty}
            onClick={() => form.reset({ ...empty, requestId: crypto.randomUUID() })}
          >
            New template
          </Button>
        </div>
      </form>
    </div>
  );
}
