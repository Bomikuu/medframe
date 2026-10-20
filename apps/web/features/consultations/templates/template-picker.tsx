"use client";
import { useState } from "react";
import { ClinicSpecialtiesDocument, ConsultationTemplatesDocument } from "@/lib/graphql/generated";
import { specialtyOptions, specialtySetupSchema } from "@/features/specialties/schema";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { FormSelect } from "@/features/patients/form-controls";
import { Button } from "@/components/ui/button";
import { recordPage } from "@/features/records/schema";
import { PageControls } from "@/features/records/record-filters";
import { LoadState } from "@/features/patients/feedback";
import { templateSchema } from "./schema";

export function TemplatePicker({
  busy,
  apply,
}: {
  busy: boolean;
  apply: (id: string) => Promise<void>;
}) {
  const { organizationId } = useWorkspace();
  const [selected, setSelected] = useState("none");
  const [after, setAfter] = useState<string>();
  const [specialty, setSpecialty] = useState("all");
  const setupRemote = useRemote(ClinicSpecialtiesDocument, { organizationId });
  const setup = specialtySetupSchema.safeParse(setupRemote.data?.clinicSpecialties);
  const remote = useRemote(ConsultationTemplatesDocument, {
    organizationId,
    after,
    specialty: specialty === "all" ? undefined : specialty,
  });
  const parsed = recordPage(templateSchema).safeParse(remote.data?.consultationTemplates);
  return (
    <details className="rounded-xl border border-border bg-card p-5">
      <summary className="min-h-11 font-medium">Consultation guidance</summary>
      <p className="mb-4 text-sm text-muted-foreground">
        Apply clinic prompts to guide documentation. Enter all findings and clinical facts yourself.
      </p>
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : parsed.success ? (
        <div className="grid max-w-xl gap-4">
          <FormSelect
            id="guidance-specialty"
            label="Template specialty"
            value={specialty}
            onChange={(value) => {
              setSpecialty(value);
              setAfter(undefined);
              setSelected("none");
            }}
            options={[
              { value: "all", label: "All specialties" },
              ...specialtyOptions(setup.success ? setup.data : undefined),
            ]}
          />
          <FormSelect
            id="consultation-template"
            label="Clinic template"
            value={selected}
            onChange={setSelected}
            options={[
              { value: "none", label: "Choose guidance" },
              ...parsed.data.items.map((item) => ({
                value: item.revision_id,
                label: `${item.name} · version ${item.version}`,
              })),
            ]}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy || selected === "none"}
            onClick={() => void apply(selected)}
          >
            Save draft and apply guidance
          </Button>
          <PageControls
            after={after}
            next={parsed.data.end_cursor}
            onChange={(value) => {
              setAfter(value);
              setSelected("none");
            }}
          />
        </div>
      ) : (
        <p role="alert">Templates could not be read.</p>
      )}
    </details>
  );
}
export function TemplatePrompts({ value }: { value: unknown }) {
  const parsed = templateSchema.safeParse(value);
  if (!parsed.success) return null;
  const template = parsed.data;
  return (
    <aside aria-label="Template guidance" className="grid gap-3 border-l-2 border-primary pl-5">
      <h2 className="font-semibold">
        {template.name} · guidance version {template.version}
      </h2>
      <p className="text-xs text-muted-foreground">
        Prompts are guidance, separate from the clinical record.
      </p>
      {Object.entries(template.prompts)
        .filter(([, text]) => text)
        .map(([key, text]) => (
          <p key={key} className="max-w-prose text-sm leading-6 whitespace-pre-wrap">
            <strong className="capitalize">{key}: </strong>
            {text}
          </p>
        ))}
      {!!template.observation_labels.length && (
        <p className="text-sm">
          Optional observations to consider: {template.observation_labels.join(", ")}
        </p>
      )}
    </aside>
  );
}
