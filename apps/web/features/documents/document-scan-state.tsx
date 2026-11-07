import { ShieldCheck, ShieldAlert, Clock3 } from "lucide-react";
import { StatusBadge } from "@/components/application/status-badge";
import { cn } from "@/lib/utils";

export function DocumentScanState({ state }: { state: string }) {
  const clean = state === "clean";
  const flagged = ["infected", "quarantined"].includes(state);
  const pending = ["pending", "scanning"].includes(state);
  const Icon = clean ? ShieldCheck : flagged ? ShieldAlert : Clock3;
  const detail =
    state === "uploading"
      ? "Upload is not complete. Finish uploading before the security scan."
      : clean
        ? "Security scan passed. Access still follows your permissions."
        : flagged
          ? "File blocked by the security scan. Do not use this attachment."
          : pending
            ? "Security scan in progress. The file is not ready to open."
            : "Scan unavailable. The file stays blocked until a clean result is recorded.";
  return (
    <div className="grid max-w-64 gap-1.5">
      <div className="flex items-center gap-2">
        <Icon
          aria-hidden
          className={cn(
            "size-4 shrink-0",
            clean ? "text-teal-ink" : flagged ? "text-destructive" : "text-warning",
          )}
        />
        <StatusBadge value={state} />
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}
