import { cn } from "@/lib/utils";
import { HeartPulse } from "lucide-react";

export function Brand({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-heading text-[23px] font-bold tracking-tight text-primary",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"
      >
        <HeartPulse className="size-[21px]" strokeWidth={1.8} />
      </span>
      <span>
        Medframe<span className="text-teal-ink">.</span>
      </span>
    </span>
  );
}
