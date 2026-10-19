import { Badge } from "@/components/ui/badge";
export function StatusBadge({ value }: { value: string }) {
  const destructive = ["cancelled", "rejected", "unsafe", "failed", "revoked"].includes(value);
  const positive = [
    "completed",
    "finalized",
    "clean",
    "recorded",
    "released",
    "in_service",
  ].includes(value);
  const attention = [
    "pending",
    "proposed",
    "waiting",
    "booked",
    "unavailable",
    "reconnecting",
    "not_reviewed",
  ].includes(value);
  return (
    <Badge
      variant={destructive ? "destructive" : positive ? "secondary" : "outline"}
      className={`h-auto min-h-6 max-w-full gap-1.5 rounded-md border-0 px-2.5 py-1 text-xs font-medium whitespace-normal capitalize ${destructive ? "bg-danger-soft text-destructive" : positive || value === "live" ? "bg-success-soft text-success" : attention ? "bg-warning-soft text-warning" : "bg-info-soft text-info"}`}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      {value.replaceAll("_", " ")}
    </Badge>
  );
}
