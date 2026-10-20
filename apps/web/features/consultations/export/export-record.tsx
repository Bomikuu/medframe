"use client";

import { useState } from "react";
import { z } from "zod";
import { EntrySheet } from "@/components/application/entry-sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { errorMessage, requestWithCsrf } from "@/lib/auth/client";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { timeLabel } from "@/features/patients/feedback";
import { downloadFile } from "./client";
import { exportPreviewSchema } from "./schema";

const sections = [
  ["soap", "Clinical notes (SOAP)"],
  ["diagnoses", "Diagnoses and recorded certainty"],
  ["observations", "Structured observations"],
  ["dental", "Dental findings and saved chart"],
  ["anatomy", "Anatomy findings and anchors"],
  ["procedures", "Recorded procedures"],
];

export function ExportRecord({
  encounterId,
  revisionId,
}: {
  encounterId: string;
  revisionId: string;
}) {
  const { can } = useWorkspace();
  if (!can("encounters.write") || !can("documents.write")) return null;
  return (
    <EntrySheet
      title="Export record"
      description="Review one preserved revision before downloading a native Medframe JSON file."
      triggerVariant="outline"
    >
      <ExportForm
        key={`${encounterId}:${revisionId}`}
        encounterId={encounterId}
        revisionId={revisionId}
      />
    </EntrySheet>
  );
}

function ExportForm({ encounterId, revisionId }: { encounterId: string; revisionId: string }) {
  const { organizationId } = useWorkspace();
  const capture = useRequestScope();
  const [selected, setSelected] = useState(["soap", "diagnoses", "observations"]);
  const [preview, setPreview] = useState<z.infer<typeof exportPreviewSchema> | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  return (
    <div className="grid gap-6">
      <p className="text-sm leading-6 text-muted-foreground">
        This file contains patient information. It includes only the selected sections of this saved
        revision. Documents, payment records and current unsaved notes are excluded. This is a
        native Medframe format, not a FHIR export.
      </p>
      <fieldset disabled={busy} className="grid gap-1">
        <legend className="mb-3 text-sm font-semibold">Include in this download</legend>
        {sections.map(([code, label]) => (
          <label
            key={code}
            className="flex min-h-14 items-center justify-between gap-4 border-b border-border py-3 text-sm"
          >
            {label}
            <Switch
              aria-label={label}
              checked={selected.includes(code)}
              onCheckedChange={(on) => {
                setSelected(on ? [...selected, code] : selected.filter((v) => v !== code));
                setPreview(null);
                setAcknowledged(false);
                setDone("");
              }}
            />
          </label>
        ))}
      </fieldset>
      <Button
        variant="outline"
        className="w-full sm:w-fit"
        disabled={busy || !selected.length}
        onClick={async () => {
          const current = capture();
          setBusy(true);
          setError("");
          setPreview(null);
          setAcknowledged(false);
          setDone("");
          try {
            const result = exportPreviewSchema.parse(
              await requestWithCsrf("interoperability/preview", {
                organization_id: organizationId,
                encounter_id: encounterId,
                revision_id: revisionId,
                sections: selected,
              }),
            );
            if (current()) setPreview(result);
          } catch (e) {
            if (current()) setError(errorMessage(e));
          } finally {
            if (current()) setBusy(false);
          }
        }}
      >
        {busy ? "Preparing…" : "Review selected revision"}
      </Button>
      {preview && (
        <section
          aria-label="Reviewed export"
          className="grid gap-4 rounded-lg border border-border p-4"
        >
          <div>
            <h3 className="font-semibold">{preview.patient.name_at_export}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{preview.patient.clinic_reference}</p>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Preserved version</dt>
              <dd className="mt-1 font-medium">Revision {preview.revision.version}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Recorded provider</dt>
              <dd className="mt-1">{preview.revision.provider_name_at_finalization}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">Finalized</dt>
              <dd className="mt-1">{timeLabel(preview.revision.finalized_at)}</dd>
            </div>
          </dl>
          <p className="text-xs leading-5 text-muted-foreground">
            {preview.schema_version} · {(preview.bytes / 1024).toFixed(1)} KiB ·{" "}
            {preview.sections.length} sections. Review expires in 10 minutes; access is checked
            again at download.
          </p>
          <label className="flex items-start justify-between gap-4 border-t border-border pt-4 text-sm leading-6">
            I have reviewed the patient, revision and sections, and want to download this file
            locally.
            <Switch
              aria-label="Confirm local download"
              disabled={busy}
              checked={acknowledged}
              onCheckedChange={setAcknowledged}
            />
          </label>
          <Button
            disabled={busy || !acknowledged}
            onClick={async () => {
              const current = capture();
              setBusy(true);
              setError("");
              try {
                await downloadFile(
                  "interoperability/download",
                  { proof: preview.proof, acknowledged: true },
                  `medframe-revision-${revisionId}.json`,
                );
                if (current())
                  setDone("Local download prepared. The saved clinical record is unchanged.");
              } catch (e) {
                if (current()) {
                  setError(errorMessage(e));
                  setPreview(null);
                  setAcknowledged(false);
                }
              } finally {
                if (current()) setBusy(false);
              }
            }}
          >
            Download JSON
          </Button>
        </section>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="text-sm text-teal-ink">
          {done}
        </p>
      )}
    </div>
  );
}
