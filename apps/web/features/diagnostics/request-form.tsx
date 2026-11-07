"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { useRemote } from "@/features/patients/use-remote";
import { DiagnosticSetupDocument } from "@/lib/graphql/generated";
import { setupSchema, modalities } from "./schema";
import { useDiagnosticAction } from "./use-diagnostics";

type Fields = {
  patient_id: string;
  test_name: string;
  modality: string;
  question: string;
  region: string;
  urgency: string;
  requested_by: string;
  instructions: string;
};
export function DiagnosticRequestForm({
  patientId,
  onSaved,
}: {
  patientId?: string;
  onSaved: () => void;
}) {
  const { organizationId, href } = useWorkspace();
  const router = useRouter();
  const action = useDiagnosticAction();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const form = useForm<Fields>({
    defaultValues: {
      patient_id: patientId ?? "",
      test_name: "",
      modality: "xray",
      question: "",
      region: "",
      urgency: "routine",
      requested_by: "",
      instructions: "",
    },
  });
  const modality = useWatch({ control: form.control, name: "modality" });
  const urgency = useWatch({ control: form.control, name: "urgency" });
  const selectedPatient = useWatch({ control: form.control, name: "patient_id" });
  const remote = useRemote(DiagnosticSetupDocument, {
    organizationId,
    search: query,
    patientId: selectedPatient || null,
  });
  const setup = setupSchema.safeParse(remote.data?.diagnosticSetup);
  useUnsavedChanges(`diagnostic-create:${organizationId}`, form.formState.isDirty, () =>
    form.reset(),
  );
  return (
    <form
      className="grid gap-6"
      onSubmit={form.handleSubmit(async (values) => {
        const result = await action.run("save_draft", {
          ...values,
          expected_version: 0,
          requested_by: values.requested_by || null,
          encounter_id: null,
          document_version_ids: selectedFiles,
        });
        if (result && typeof result === "object" && "id" in result) {
          form.reset();
          onSaved();
          router.push(href(`/clinic/diagnostics/${String(result.id)}`));
        }
      })}
    >
      <fieldset className="grid gap-4">
        <legend className="mb-4 font-semibold">Patient</legend>
        {!selectedPatient && (
          <div className="flex flex-wrap items-end gap-3">
            <FormField id="diagnostic-patient-search" label="Find patient">
              <Input
                id="diagnostic-patient-search"
                type="search"
                maxLength={160}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </FormField>
            <Button type="button" variant="outline" onClick={() => setQuery(search)}>
              Find patient
            </Button>
          </div>
        )}
        <FormSelect
          id="diagnostic-patient"
          label="Patient with clinical access"
          personKind="patient"
          value={selectedPatient}
          onChange={(value) => {
            form.setValue("patient_id", value, { shouldDirty: true });
            setSelectedFiles([]);
          }}
          options={[
            { value: "", label: "Choose patient" },
            ...(setup.success
              ? setup.data.patients.map((p) => ({
                  value: p.id,
                  label: `${p.name} · ${p.reference}`,
                }))
              : []),
          ]}
        />
      </fieldset>
      <fieldset className="grid gap-4 border-t border-border pt-5">
        <legend className="font-semibold">Requested examination</legend>
        <FormSelect
          id="diagnostic-modality"
          label="Modality"
          value={modality}
          onChange={(v) => form.setValue("modality", v, { shouldDirty: true })}
          options={modalities}
        />
        <FormField id="diagnostic-test" label="Test name">
          <Input
            id="diagnostic-test"
            required
            maxLength={160}
            {...form.register("test_name", { required: true })}
          />
        </FormField>
        <FormField id="diagnostic-region" label="Body region">
          <Input id="diagnostic-region" maxLength={120} {...form.register("region")} />
        </FormField>
        <FormField id="diagnostic-question" label="Clinical question shared with the center">
          <Textarea
            id="diagnostic-question"
            required
            maxLength={4000}
            rows={4}
            {...form.register("question", { required: true })}
          />
        </FormField>
      </fieldset>
      <fieldset className="grid gap-4 border-t border-border pt-5">
        <legend className="font-semibold">Timing and preparation</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            id="diagnostic-urgency"
            label="Priority"
            value={urgency}
            onChange={(v) => form.setValue("urgency", v, { shouldDirty: true })}
            options={[
              { value: "routine", label: "Routine" },
              { value: "urgent", label: "Urgent — no emergency service implied" },
            ]}
          />
          <FormField id="diagnostic-date" label="Requested by (optional)">
            <Input id="diagnostic-date" type="date" {...form.register("requested_by")} />
          </FormField>
        </div>
        <FormField
          id="diagnostic-instructions"
          label="Preparation instructions visible to the patient"
        >
          <Textarea
            id="diagnostic-instructions"
            maxLength={2000}
            {...form.register("instructions")}
          />
        </FormField>
      </fieldset>
      <fieldset className="grid gap-3 border-t border-border pt-5">
        <legend className="font-semibold">Select exact clean file versions</legend>
        <p className="text-sm text-muted-foreground">
          Only selected files are shared. The complete patient chart stays private.
        </p>
        {setup.success &&
          setup.data.files.map((file) => (
            <label className="flex min-h-11 items-center gap-3" key={file.id}>
              <Checkbox
                checked={selectedFiles.includes(file.id)}
                onCheckedChange={(checked) =>
                  setSelectedFiles((previous) =>
                    checked ? [...previous, file.id] : previous.filter((id) => id !== file.id),
                  )
                }
              />
              {file.label}
            </label>
          ))}
        {setup.success && !setup.data.files.length && (
          <p className="text-sm text-muted-foreground">
            No clean clinical files available for this patient.
          </p>
        )}
      </fieldset>
      {action.error && (
        <p role="alert" className="text-destructive">
          {action.error}
        </p>
      )}
      <Button disabled={action.busy || !selectedPatient} type="submit">
        {action.busy ? "Saving…" : "Save request draft"}
      </Button>
    </form>
  );
}
