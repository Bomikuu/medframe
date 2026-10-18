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
  return (
    <Badge
      variant={destructive ? "destructive" : positive ? "secondary" : "outline"}
      className="h-auto min-h-6 max-w-full rounded-md px-2 py-1 text-xs font-medium whitespace-normal capitalize"
    >
      {value.replaceAll("_", " ")}
    </Badge>
  );
}
