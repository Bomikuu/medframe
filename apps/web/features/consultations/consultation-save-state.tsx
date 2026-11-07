"use client";

import { CircleCheck, CloudUpload, History, LockKeyhole, TriangleAlert } from "lucide-react";
import { useClinicTime } from "@/components/application/clinical-locale";
import { cn } from "@/lib/utils";

/** Presentation only: the encounter's existing version/save/lease owner supplies all facts. */
export function ConsultationSaveState({
  dirty,
  busy,
  readOnly,
  historical,
  failure,
  version,
  savedAt,
  message,
}: {
  dirty: boolean;
  busy: boolean;
  readOnly: boolean;
  historical: boolean;
  failure: boolean;
  version: number;
  savedAt: string;
  message: string;
}) {
  const timeLabel = useClinicTime();
  const Icon = failure
    ? TriangleAlert
    : historical
      ? History
      : readOnly
        ? LockKeyhole
        : dirty || busy
          ? CloudUpload
          : CircleCheck;
  const title = failure
    ? "Save needs attention"
    : historical
      ? "Preserved revision"
      : readOnly
        ? "Read-only consultation"
        : busy
          ? "Saving your changes"
          : dirty
            ? "Changes waiting to save"
            : "Saved to the clinical record";
  return (
    <div role="status" className="max-w-xl">
      <p
        className={cn(
          "flex items-center gap-2 text-sm font-medium",
          failure ? "text-destructive" : dirty ? "text-warning" : "text-teal-ink",
        )}
      >
        <Icon aria-hidden className="size-4 shrink-0" />
        {title}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {dirty && !readOnly
          ? "Unsaved edits are kept in this browser session until a save succeeds. "
          : ""}
        {historical ? "Earlier care remains unchanged. " : ""}
        Saved version {version} · {timeLabel(savedAt)}
      </p>
      {message && <p className="mt-1 text-xs leading-5 text-muted-foreground">{message}</p>}
    </div>
  );
}

export function ConsultationReviewSummary({
  notes,
  diagnoses,
  findings,
  documents,
  pendingUpload,
}: {
  notes: boolean;
  diagnoses: number;
  findings: number;
  documents: number;
  pendingUpload: boolean;
}) {
  return (
    <section
      aria-label="Final review summary"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h3 className="text-sm font-semibold">Before you finalize</h3>
      <ul className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <li>Notes: {notes ? "entered — review for accuracy" : "none entered"}</li>
        <li>Diagnoses: {diagnoses} recorded — check certainty</li>
        <li>Chart findings: {findings} recorded</li>
        <li>
          Documents: {documents} attached{pendingUpload ? " · upload unfinished" : ""}
        </li>
      </ul>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Counts are a review aid, not a clinical completeness check. Finalization preserves this
        revision; later corrections require an amendment.
      </p>
    </section>
  );
}
