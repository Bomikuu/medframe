import { Focus, LockKeyhole, MapPin } from "lucide-react";

/** Shared chart context without creating another finding or clinical record. */
export function ClinicalSelectionState({
  label,
  detail,
  findings,
  readOnly,
}: {
  label: string;
  detail: string;
  findings: number;
  readOnly: boolean;
}) {
  const ModeIcon = readOnly ? LockKeyhole : MapPin;
  return (
    <div
      className="my-3 rounded-lg bg-secondary/60 px-3 py-2.5"
      aria-label="Current chart selection"
      aria-live="polite"
    >
      <p className="flex items-center gap-2 text-xs font-semibold text-teal-ink">
        <Focus aria-hidden className="size-4 shrink-0" />
        {label}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {detail} · {findings} finding{findings === 1 ? "" : "s"}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ModeIcon aria-hidden className="size-3.5 shrink-0" />
        {readOnly
          ? "Viewing only — findings cannot be changed here"
          : "New notes apply to this selection and save with the consultation"}
      </p>
    </div>
  );
}
