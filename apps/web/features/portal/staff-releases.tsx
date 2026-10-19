"use client";
import { useClinicTime } from "@/components/application/clinical-locale";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  PatientReleasesDocument,
  ReleaseSourcesDocument,
  ReleaseSourcePageDocument,
  PreviewPortalReleaseDocument,
  PublishPortalReleaseDocument,
  WithdrawPortalReleaseDocument,
  DocumentDownloadDocument,
} from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { useSafety, useUnsavedChanges } from "@/features/workspace/safety-provider";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { LoadState, failureText } from "@/features/patients/feedback";
import { recordPage, sourceSchema } from "@/features/records/schema";
import { PageControls } from "@/features/records/record-filters";
import { releaseRowSchema, releasePayloadSchema } from "./schema";
import { ReleaseView } from "./release-view";

const sourcesSchema = z.object({
  source_cursors: z.record(z.string(), z.string().nullable()),
  encounters: z.array(sourceSchema),
  plans: z.array(sourceSchema),
  follow_ups: z.array(sourceSchema),
  documents: z.array(sourceSchema),
  diagnostics: z.array(sourceSchema),
});
const empty = {
  summary: "",
  encounterId: "",
  soapSections: [] as string[],
  diagnoses: false,
  procedures: false,
  chartId: "",
  planIds: [] as string[],
  followupIds: [] as string[],
  documentIds: [] as string[],
  diagnosticIds: [] as string[],
  requestId: "",
};
const previewSchema = z.object({ digest: z.string(), payload: releasePayloadSchema });
export function StaffReleases({ patientId }: { patientId: string }) {
  const timeLabel = useClinicTime();
  const { organizationId, can } = useWorkspace();
  const [after, setAfter] = useState<string>();
  const remote = useRemote(PatientReleasesDocument, { organizationId, patientId, after });
  const parsed = recordPage(releaseRowSchema.extend({ payload: releasePayloadSchema })).safeParse(
    remote.data?.patientReleases,
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const capture = useRequestScope();
  const { confirm } = useSafety();
  const writer = can("encounters.write") && can("patients.clinical.write");
  return (
    <section className="grid gap-5 border-t border-border pt-6">
      <h2 className="text-xl font-semibold">Records shared with the patient</h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        Only explicitly published versions appear in the portal. New amendments and plan edits
        require a new release.
      </p>
      {writer && <ReleaseForm patientId={patientId} onPublished={remote.reload} />}
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : parsed.success ? (
        <>
          {!parsed.data.items.length && (
            <p className="text-sm text-muted-foreground">No clinical records have been released.</p>
          )}
          {parsed.data.items.map((item) => (
            <details key={item.id} className="rounded-xl border border-border bg-card p-5">
              <summary className="min-h-11 font-medium">
                Release {item.sequence} · {item.state} · {timeLabel(item.created_at)}
              </summary>
              <p className="mb-4 text-sm text-muted-foreground">Published by {item.author}</p>
              <ReleaseView
                payload={item.payload}
                authorize={async (versionId) => {
                  const result = await getGraphqlClient().request(DocumentDownloadDocument, {
                    organizationId,
                    versionId,
                  });
                  return `/api/backend/documents/download?ticket=${encodeURIComponent(result.authorizeDocumentDownload)}`;
                }}
              />
              {writer && item.state === "published" && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5"
                  disabled={busy || !reason.trim()}
                  onClick={async () => {
                    if (
                      !(await confirm({
                        title: "Withdraw this release?",
                        description:
                          "The patient and verified guardians will no longer be authorized to open this release. Previously downloaded copies cannot be recalled.",
                        action: "Withdraw release",
                      }))
                    )
                      return;
                    const current = capture();
                    setBusy(true);
                    setError(null);
                    try {
                      await getGraphqlClient().request(WithdrawPortalReleaseDocument, {
                        organizationId,
                        releaseId: item.id,
                        expectedVersion: item.state_version,
                        reason,
                      });
                      if (current()) {
                        remote.reload();
                        setReason("");
                      }
                    } catch (failure) {
                      if (current()) setError(failure);
                    } finally {
                      if (current()) setBusy(false);
                    }
                  }}
                >
                  Withdraw release {item.sequence}
                </Button>
              )}
            </details>
          ))}
          <PageControls after={after} next={parsed.data.end_cursor} onChange={setAfter} />
        </>
      ) : (
        <p role="alert">Releases could not be read.</p>
      )}
      {writer && (
        <FormField id="withdraw-release-reason" label="Reason for withdrawal">
          <Input
            id="withdraw-release-reason"
            maxLength={240}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </FormField>
      )}
      {error !== null && <p role="alert">{failureText(error)}</p>}
    </section>
  );
}
function ReleaseForm({ patientId, onPublished }: { patientId: string; onPublished: () => void }) {
  const timeLabel = useClinicTime();
  const { organizationId } = useWorkspace();
  const { confirm } = useSafety();
  const capture = useRequestScope();
  const sources = useRemote(ReleaseSourcesDocument, { organizationId, patientId });
  const parsed = sourcesSchema.safeParse(sources.data?.releaseSources);
  const [older, setOlder] = useState<
    Record<string, { items: z.infer<typeof sourceSchema>[]; cursor: string | null }>
  >({});
  const sourceLists = parsed.success
    ? {
        ...parsed.data,
        encounters: [...parsed.data.encounters, ...(older.encounters?.items ?? [])],
        plans: [...parsed.data.plans, ...(older.plans?.items ?? [])],
        follow_ups: [...parsed.data.follow_ups, ...(older.follow_ups?.items ?? [])],
        documents: [...parsed.data.documents, ...(older.documents?.items ?? [])],
        diagnostics: [...parsed.data.diagnostics, ...(older.diagnostics?.items ?? [])],
      }
    : null;

  const form = useForm({ defaultValues: { ...empty, requestId: crypto.randomUUID() } });
  const [preview, setPreview] = useState<{
    digest: string;
    payload: z.infer<typeof releasePayloadSchema>;
    selection: unknown;
    serialized: string;
  } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useUnsavedChanges(`release:${organizationId}:${patientId}`, form.formState.isDirty, () => {
    form.reset();
    setPreview(null);
  });
  const values = useWatch({ control: form.control });
  const serialized = JSON.stringify(values);
  const validPreview = preview?.serialized === serialized ? preview : null;
  function selectList(
    key: "planIds" | "followupIds" | "documentIds" | "diagnosticIds",
    id: string,
    checked: boolean,
  ) {
    const selected = form.getValues(key);
    form.setValue(key, checked ? [...selected, id] : selected.filter((value) => value !== id), {
      shouldDirty: true,
    });
  }
  return (
    <details
      className="rounded-xl border border-border bg-card p-5"
      onToggle={(event) => {
        if (event.currentTarget.open) {
          sources.reload();
          setOlder({});
        }
      }}
    >
      <summary className="min-h-11 font-medium">Prepare a clinical release</summary>
      <form
        noValidate
        className="mt-5 grid gap-5"
        onSubmit={form.handleSubmit(async (input) => {
          const current = capture();
          setError(null);
          setMessage("");
          setPreview(null);
          const selection = {
            summary: input.summary,
            encounters: input.encounterId
              ? [
                  {
                    revision_id: input.encounterId,
                    soap_sections: input.soapSections,
                    diagnoses: input.diagnoses,
                    procedures: input.procedures,
                  },
                ]
              : [],
            chart_revision_id: input.chartId || null,
            plan_revision_ids: input.planIds,
            follow_up_revision_ids: input.followupIds,
            document_version_ids: input.documentIds,
            diagnostic_result_ids: input.diagnosticIds,
          };
          try {
            const result = await getGraphqlClient().request(PreviewPortalReleaseDocument, {
              organizationId,
              patientId,
              selection,
            });
            if (current()) {
              const reviewed = previewSchema.parse(result.previewPortalRelease);
              setPreview({ ...reviewed, selection, serialized: JSON.stringify(input) });
            }
          } catch (failure) {
            if (current()) setError(failure);
          }
        })}
      >
        <FormField
          id="release-summary"
          label="Patient-facing care summary"
          error={form.formState.errors.summary?.message}
        >
          <Textarea
            className="min-h-32 resize-none"
            id="release-summary"
            rows={4}
            maxLength={4000}
            {...form.register("summary", {
              required: "Enter the summary the patient should receive.",
            })}
          />
        </FormField>
        {!sources.data ? (
          <LoadState error={sources.error} retry={sources.reload} />
        ) : parsed.success ? (
          <>
            <fieldset className="grid gap-3">
              <legend className="mb-3 font-medium">Finalized consultation (optional)</legend>
              <p className="text-xs text-muted-foreground">
                Choose an exact revision, then select each section to share.
              </p>
              {sourceLists!.encounters.map((item) => (
                <label key={item.id} className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="radio"
                    {...form.register("encounterId")}
                    value={item.id}
                    className="size-4 accent-primary"
                  />
                  {item.label} · revision {item.version} · {timeLabel(item.created_at)}
                </label>
              ))}
              <Button
                type="button"
                variant="ghost"
                className="justify-self-start"
                onClick={() => form.setValue("encounterId", "", { shouldDirty: true })}
              >
                Clear consultation selection
              </Button>
              <div className="flex flex-wrap gap-5">
                {["subjective", "objective", "assessment", "plan"].map((section) => (
                  <label key={section} className="flex min-h-11 items-center gap-2 text-sm">
                    <Checkbox
                      checked={(values.soapSections ?? []).includes(section)}
                      onCheckedChange={(checked) =>
                        form.setValue(
                          "soapSections",
                          checked === true
                            ? [...(values.soapSections ?? []), section]
                            : (values.soapSections ?? []).filter((value) => value !== section),
                          { shouldDirty: true },
                        )
                      }
                    />
                    {section[0].toUpperCase() + section.slice(1)}
                  </label>
                ))}
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <Checkbox
                    checked={values.diagnoses}
                    onCheckedChange={(checked) =>
                      form.setValue("diagnoses", checked === true, { shouldDirty: true })
                    }
                  />
                  Diagnoses and certainty
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <Checkbox
                    checked={values.procedures}
                    onCheckedChange={(checked) =>
                      form.setValue("procedures", checked === true, { shouldDirty: true })
                    }
                  />
                  Procedures and status
                </label>
              </div>
            </fieldset>
            <fieldset className="grid gap-2 border-t border-border pt-4">
              <legend className="font-medium">Dental chart snapshot (optional)</legend>
              {sourceLists!.encounters.map((item) => (
                <label key={item.id} className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="radio"
                    {...form.register("chartId")}
                    value={item.id}
                    className="size-4 accent-primary"
                  />
                  {item.label} · chart revision {item.version}
                </label>
              ))}
              <Button
                type="button"
                variant="ghost"
                className="justify-self-start"
                onClick={() => form.setValue("chartId", "", { shouldDirty: true })}
              >
                Clear chart selection
              </Button>
            </fieldset>
            {(
              [
                { key: "planIds", title: "Plan versions", items: sourceLists!.plans },
                { key: "followupIds", title: "Follow-up versions", items: sourceLists!.follow_ups },
                { key: "documentIds", title: "Clean file versions", items: sourceLists!.documents },
                {
                  key: "diagnosticIds",
                  title: "Reviewed diagnostic result versions",
                  items: sourceLists!.diagnostics,
                },
              ] as const
            ).map((group) => (
              <fieldset key={group.key} className="grid gap-2 border-t border-border pt-4">
                <legend className="font-medium">{group.title}</legend>
                {group.items.length ? (
                  group.items.map((item) => (
                    <label key={item.id} className="flex min-h-11 items-center gap-3 text-sm">
                      <Checkbox
                        checked={(values[group.key] ?? []).includes(item.id)}
                        onCheckedChange={(checked) =>
                          selectList(group.key, item.id, checked === true)
                        }
                      />
                      {item.label} · version {item.version} · {timeLabel(item.created_at)}
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No eligible versions.</p>
                )}
              </fieldset>
            ))}
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  sources.reload();
                  setOlder({});
                }}
              >
                Refresh available versions
              </Button>
              {["encounters", "plans", "follow_ups", "documents", "diagnostics"].map((kind) => {
                const cursor = older[kind] ? older[kind].cursor : parsed.data.source_cursors[kind];
                return cursor ? (
                  <Button
                    key={kind}
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      const current = capture();
                      setBusy(true);
                      setError(null);
                      try {
                        const result = await getGraphqlClient().request(ReleaseSourcePageDocument, {
                          organizationId,
                          patientId,
                          kind,
                          after: cursor,
                        });
                        if (current()) {
                          const page = recordPage(sourceSchema).parse(result.releaseSourcePage);
                          setOlder((previous) => ({
                            ...previous,
                            [kind]: {
                              items: [...(previous[kind]?.items ?? []), ...page.items],
                              cursor: page.end_cursor,
                            },
                          }));
                        }
                      } catch (failure) {
                        if (current()) setError(failure);
                      } finally {
                        if (current()) setBusy(false);
                      }
                    }}
                  >
                    Older {kind.replaceAll("_", " ")} versions
                  </Button>
                ) : null;
              })}
            </div>
          </>
        ) : (
          <p role="alert">Release sources could not be read.</p>
        )}
        <Button
          className="justify-self-start"
          disabled={form.formState.isSubmitting || busy || !parsed.success}
        >
          Preview selected records
        </Button>
      </form>
      {error !== null && (
        <p role="alert" className="mt-4">
          {failureText(error)}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4">
          {message}
        </p>
      )}
      {validPreview && (
        <div className="mt-8 grid gap-6 border-t-2 border-primary pt-6">
          <h3 className="text-xl font-semibold">Patient preview</h3>
          <ReleaseView payload={validPreview.payload} />
          <Button
            type="button"
            disabled={busy}
            className="justify-self-start"
            onClick={async () => {
              if (
                !(await confirm({
                  title: "Publish these records to the patient?",
                  description:
                    "The patient and active verified guardians will be able to read exactly the summary, clinical sections, snapshots and file versions shown in this preview.",
                  action: "Publish patient release",
                }))
              )
                return;
              const current = capture();
              setBusy(true);
              setError(null);
              try {
                await getGraphqlClient().request(PublishPortalReleaseDocument, {
                  organizationId,
                  patientId,
                  selection: validPreview.selection,
                  previewDigest: validPreview.digest,
                  requestId: values.requestId ?? form.getValues("requestId"),
                });
                if (current()) {
                  form.reset({ ...empty, requestId: crypto.randomUUID() });
                  setPreview(null);
                  setMessage("Patient release published.");
                  onPublished();
                }
              } catch (failure) {
                if (current()) setError(failure);
              } finally {
                if (current()) setBusy(false);
              }
            }}
          >
            Publish patient release
          </Button>
        </div>
      )}
    </details>
  );
}
