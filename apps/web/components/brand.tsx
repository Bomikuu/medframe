import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("text-2xl font-semibold tracking-tight text-foreground", className)}>
      Medframe
    </span>
  );
}
