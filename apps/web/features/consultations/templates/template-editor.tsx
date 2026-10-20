"use client";
import { ButtonLink } from "@/components/ui/button-link";
import { EmptyState } from "@/components/application/empty-state";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  ConsultationTemplatesDocument,
  SaveConsultationTemplateDocument,
  ClinicSpecialtiesDocument,
} from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety, useUnsavedChanges } from "@/features/workspace/safety-provider";
import {
  specialtyOptions,
  specialtySetupSchema,
  specialtyName,
  specialtyStatus,
} from "@/features/specialties/schema";
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
  const { organizationId, can, href } = useWorkspace();
  const { confirm } = useSafety();
  const setupRemote = useRemote(
    ClinicSpecialtiesDocument,
    { organizationId },
    { enabled: can("encounters.write") },
  );
  const setup = specialtySetupSchema.safeParse(setupRemote.data?.clinicSpecialties);
  const [after, setAfter] = useState<string>();
  const [filter, setFilter] = useState("all");
  const remote = useRemote(ConsultationTemplatesDocument, {
    organizationId,
    includeArchived: true,
    specialty: filter === "all" ? undefined : filter,
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
    <div className="@container grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(260px,0.65fr)_minmax(0,1fr)]">
      <div className="xl:col-span-2 [&_[data-page-header]]:mb-0">
        <PageHeading
          title="Consultation templates"
          description="Reusable prompts guide clinician-authored notes. Patient facts are never copied into templates."
        />
      </div>
      <section
        aria-label="Saved templates"
        className="min-w-0 rounded-xl border border-border bg-card p-5"
      >
        <h2 className="mb-4 text-lg font-semibold">Saved templates</h2>
        <div className="mb-5">
          <FormSelect
            id="saved-template-specialty"
            label="Filter by specialty"
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setAfter(undefined);
            }}
            options={[
              { value: "all", label: "All specialties" },
              ...specialtyOptions(setup.success ? setup.data : undefined),
            ]}
          />
        </div>
        {form.formState.isDirty && (
          <p className="mb-4 text-xs leading-5 text-muted-foreground">
            Save or discard this draft before opening another template.
          </p>
        )}
        {!remote.data ? (
          <LoadState error={remote.error} retry={remote.reload} />
        ) : parsed.success ? (
          <>
            {!parsed.data.items.length && (
              <EmptyState
                title="No templates yet"
                description={
                  filter === "all"
                    ? "Create reusable prompts with the form. Patient information stays in the consultation."
                    : "No saved templates for this specialty on this page. Choose another specialty or create a template."
                }
              />
            )}
            <ul className="grid gap-3">
              {parsed.data.items.map((item) => (
                <li
                  key={item.revision_id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium wrap-anywhere">{item.name}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {specialtyName(item.specialty, setup.success ? setup.data : undefined)} ·
                      Version {item.version}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.active ? "Active" : "Archived"} ·{" "}
                      {specialtyStatus(item.specialty, setup.success ? setup.data : undefined)}
                    </p>
                  </div>
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
      </section>
      <form
        noValidate
        className="@container grid min-w-0 gap-5 rounded-xl border border-border bg-card p-5"
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
        {!!setupRemote.error && (
          <p role="status" className="text-sm text-muted-foreground">
            Specialty starters are unavailable. Standard documentation remains available.{" "}
            <Button type="button" variant="link" onClick={setupRemote.reload}>
              Retry specialty starters
            </Button>
          </p>
        )}
        {setup.success && setup.data.starters.length === 0 && (
          <section
            aria-label="Standard guidance"
            className="grid gap-3 border-b border-border pb-5"
          >
            <h2 className="font-semibold">Start with standard guidance</h2>
            <p className="max-w-prose text-sm leading-6 text-muted-foreground">
              Other, Dentistry and General medicine remain available. Create your own documentation
              prompts below. No specialty starter is enabled for this clinic.
            </p>
            {can("organization.manage") && (
              <ButtonLink variant="outline" href={href("/clinic/settings/specialties")}>
                Choose clinic specialties
              </ButtonLink>
            )}
          </section>
        )}
        {setup.success && setup.data.starters.length > 0 && (
          <section
            aria-label="Specialty starters"
            className="grid gap-3 border-b border-border pb-5"
          >
            <h2 className="font-semibold">Start with a specialty</h2>
            <p className="text-xs leading-5 text-muted-foreground">
              Copy editable documentation prompts. Saving creates a clinic template; no patient
              facts or clinical advice are generated.
            </p>
            <div className="flex flex-wrap gap-2">
              {setup.data.starters.map((starter) => (
                <Button
                  type="button"
                  variant="outline"
                  key={starter.specialty}
                  onClick={async () => {
                    if (
                      form.formState.isDirty &&
                      !(await confirm({
                        title: "Replace this template draft?",
                        description:
                          "Your unsaved template edits will be replaced with editable starter prompts.",
                        action: "Use starter",
                      }))
                    )
                      return;
                    form.reset({ ...empty, requestId: crypto.randomUUID() });
                    form.setValue("name", starter.name, { shouldDirty: true });
                    form.setValue("specialty", starter.specialty, { shouldDirty: true });
                    form.setValue("prompts", starter.prompts, { shouldDirty: true });
                    form.setValue("labels", starter.observation_labels.join("\n"), {
                      shouldDirty: true,
                    });
                    setSaved("");
                  }}
                >
                  Use {specialtyName(starter.specialty, setup.data)}
                </Button>
              ))}
            </div>
          </section>
        )}
        <div className="grid gap-4 @[640px]:grid-cols-[minmax(0,1fr)_220px]">
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
            options={specialtyOptions(
              setup.success ? setup.data : undefined,
              watchedForm.specialty,
            )}
          />
        </div>
        <div className="grid min-w-0 gap-4 @[560px]:grid-cols-2">
          {(["subjective", "objective", "assessment", "plan"] as const).map((section) => (
            <FormField
              key={section}
              id={`prompt-${section}`}
              label={`${section[0].toUpperCase()}${section.slice(1)} prompt`}
            >
              <Textarea
                className="min-h-28 resize-y"
                id={`prompt-${section}`}
                maxLength={1000}
                rows={3}
                {...form.register(`prompts.${section}`)}
              />
            </FormField>
          ))}
        </div>
        <FormField
          id="template-labels"
          label="Optional observation labels"
          hint="One label per line; up to 20 labels of 120 characters. No measured values."
        >
          <Textarea
            className="min-h-28 resize-y"
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
        <p role="status" className="text-sm text-muted-foreground">
          {form.formState.isSubmitting
            ? "Saving template…"
            : form.formState.isDirty
              ? "Unsaved template changes"
              : saved || "No unsaved changes"}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button disabled={form.formState.isSubmitting}>Save template version</Button>
          {form.formState.isDirty && (
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={async () => {
                if (
                  await confirm({
                    title: "Discard template changes?",
                    description:
                      "Your unsaved edits will be replaced by the last loaded template or blank draft.",
                    action: "Discard changes",
                  })
                ) {
                  form.reset();
                  setError(null);
                  setSaved("");
                }
              }}
            >
              Discard changes
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={form.formState.isDirty || form.formState.isSubmitting}
            onClick={() => form.reset({ ...empty, requestId: crypto.randomUUID() })}
          >
            New template
          </Button>
        </div>
      </form>
    </div>
  );
}
