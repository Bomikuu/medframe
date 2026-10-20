import type { Lease } from "./client";

/** Presentation only; the existing lease and encounter owners enforce writes. */
export function editorAccessLabel({
  historical,
  editable,
  permitted,
  canEdit,
  lease,
  error,
}: {
  historical: boolean;
  editable: boolean;
  permitted: boolean;
  canEdit: boolean;
  lease: Lease | null;
  error: string;
}) {
  if (historical)
    return "Historical revision · read only. Return to the current consultation to edit.";
  if (!editable) return "Finalized record · read only. Start an amendment to record a correction.";
  if (!permitted) return "Read only · your clinic membership cannot edit consultations.";
  if (error) return `Editing paused · ${error}`;
  if (!canEdit) {
    return lease?.locked
      ? "Read only · this Station is locked. Resume or transfer editing before changing the record."
      : `Read only · ${lease?.owner || "another clinician"} has editing responsibility. Use Transfer editing on the owning device.`;
  }
  return "Editing on this device · changes save to this consultation draft.";
}
