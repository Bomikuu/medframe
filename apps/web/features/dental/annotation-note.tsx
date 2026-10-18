"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Finding } from "@/features/consultations/schema";

export function AnnotationComposer({
  value,
  onChange,
  onPost,
  onCancel,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onPost: () => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  return (
    <>
      <label htmlFor="new-dental-note" className="text-sm font-medium">
        Note
      </label>
      <Textarea
        id="new-dental-note"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={500}
        rows={4}
        placeholder="Write a note about this point…"
        disabled={disabled}
      />
      <p className="text-xs text-muted-foreground">
        This point marks a visual location. Clinical surfaces are labelled separately.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel note
        </Button>
        <Button type="button" onClick={onPost} disabled={disabled || !value.trim()}>
          Add note
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Save the consultation to persist your note.</p>
    </>
  );
}

export function AnnotationNote({
  finding,
  onChange,
  onStatus,
  onRemove,
}: {
  finding: Finding;
  onChange?: (value: string) => void;
  onStatus?: (status: "active" | "resolved") => void;
  onRemove?: () => void;
}) {
  return (
    <>
      {onChange ? (
        <>
          <label htmlFor={`note-${finding.key}`} className="text-sm font-medium">
            Note
          </label>
          <Textarea
            id={`note-${finding.key}`}
            value={finding.notes}
            onChange={(event) => onChange(event.target.value)}
            maxLength={500}
            rows={4}
          />
        </>
      ) : (
        <p className="leading-6 whitespace-pre-wrap">{finding.notes || finding.condition}</p>
      )}
      <p className="text-xs text-muted-foreground">
        {finding.status} · Tooth {finding.tooth} ·{" "}
        {finding.surfaces.join(", ") || "Point annotation; no clinical surface assigned"}
      </p>
      {onStatus && (
        <div className="flex flex-wrap justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onStatus(finding.status === "resolved" ? "active" : "resolved")}
          >
            {finding.status === "resolved" ? "Reopen note" : "Resolve note"}
          </Button>
          <Button type="button" variant="ghost" onClick={onRemove}>
            Remove note
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {onChange
          ? "Changes stay in this draft until the consultation is saved."
          : "Recorded note · read only"}
      </p>
    </>
  );
}
