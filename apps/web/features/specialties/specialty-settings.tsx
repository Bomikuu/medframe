"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ClinicSpecialtiesDocument, SaveClinicSpecialtiesDocument } from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { errorMessage } from "@/lib/auth/client";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety, useUnsavedChanges } from "@/features/workspace/safety-provider";
import { PageHeading, LoadState } from "@/features/patients/feedback";
import { specialtySetupSchema, type SpecialtySetup } from "./schema";

export function SpecialtySettings() {
  const { organizationId, can } = useWorkspace();
  const remote = useRemote(
    ClinicSpecialtiesDocument,
    { organizationId },
    { enabled: can("organization.manage") },
  );
  const parsed = specialtySetupSchema.safeParse(remote.data?.clinicSpecialties);
  return (
    <div className="grid gap-6">
      <PageHeading
        title="Clinic specialties"
        description="Choose the specialties available for new consultation templates."
      />
      {!can("organization.manage") ? (
        <p>Clinic administration access is required.</p>
      ) : !parsed.success ? (
        <LoadState
          error={remote.error ?? (remote.data ? new Error("Specialties could not be read.") : null)}
          retry={remote.reload}
        />
      ) : (
        <SpecialtyForm key={organizationId} initial={parsed.data} />
      )}
    </div>
  );
}

function SpecialtyForm({ initial }: { initial: SpecialtySetup }) {
  const { organizationId } = useWorkspace();
  const { confirm } = useSafety();
  const capture = useRequestScope();
  const form = useForm({
    defaultValues: {
      codes: initial.selected,
      version: initial.version,
      requestId: crypto.randomUUID(),
    },
  });
  const codes = useWatch({ control: form.control, name: "codes" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  useUnsavedChanges(`specialties:${organizationId}`, form.formState.isDirty, () => form.reset());
  return (
    <form
      className="grid gap-6"
      onSubmit={form.handleSubmit(async (values) => {
        const current = capture();
        setBusy(true);
        setError("");
        setSaved("");
        try {
          const response = await getGraphqlClient().request(SaveClinicSpecialtiesDocument, {
            organizationId,
            codes: values.codes,
            expectedVersion: values.version,
            requestId: values.requestId,
          });
          const data = specialtySetupSchema.parse(response.saveClinicSpecialties);
          if (!current()) return;
          form.reset({
            codes: data.selected,
            version: data.version,
            requestId: crypto.randomUUID(),
          });
          setSaved(`Specialties saved · Version ${data.version}`);
        } catch (e) {
          if (current()) setError(errorMessage(e));
        } finally {
          if (current()) setBusy(false);
        }
      })}
    >
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        Selections enable template choices. They do not verify professional credentials or change a
        provider’s specialty. Removing a selection preserves existing consultations and template
        history.
      </p>
      <fieldset disabled={busy} className="grid gap-6 lg:grid-cols-2">
        {["dental", "medicine"].map((category) => (
          <section key={category} className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold">
              {category === "dental" ? "Dental practice" : "Medical practice"}
            </h2>
            <div className="mt-4 divide-y divide-border">
              {initial.catalog
                .filter((o) => o.category === category)
                .map((o) => (
                  <label
                    key={o.code}
                    className="flex min-h-14 items-center justify-between gap-4 py-3"
                  >
                    <span className="text-sm">
                      {o.name}
                      {!o.active && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          Unavailable for new selection
                        </span>
                      )}
                    </span>
                    <Switch
                      aria-label={o.name}
                      disabled={!o.active && !codes.includes(o.code)}
                      checked={codes.includes(o.code)}
                      onCheckedChange={(enabled) =>
                        form.setValue(
                          "codes",
                          enabled ? [...codes, o.code] : codes.filter((c) => c !== o.code),
                          { shouldDirty: true },
                        )
                      }
                    />
                  </label>
                ))}
            </div>
          </section>
        ))}
      </fieldset>
      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
          <p>{error}</p>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              if (
                await confirm({
                  title: "Reload saved specialties?",
                  description:
                    "Unsaved specialty selections will be replaced by the current saved settings.",
                  action: "Reload settings",
                })
              ) {
                setBusy(true);
                try {
                  const result = await getGraphqlClient().request(ClinicSpecialtiesDocument, {
                    organizationId,
                  });
                  const data = specialtySetupSchema.parse(result.clinicSpecialties);
                  form.reset({
                    codes: data.selected,
                    version: data.version,
                    requestId: crypto.randomUUID(),
                  });
                  setError("");
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }
            }}
          >
            Reload settings
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
        <p role="status" className="text-sm text-muted-foreground">
          {saved ||
            (form.formState.isDirty
              ? "Unsaved selections"
              : `Saved selection · Version ${form.getValues("version")}`)}
        </p>
        <Button type="submit" disabled={busy || !form.formState.isDirty}>
          {busy ? "Saving…" : "Save specialties"}
        </Button>
      </div>
    </form>
  );
}
