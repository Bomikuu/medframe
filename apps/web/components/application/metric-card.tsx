import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
export function MetricCard({
  label,
  value,
  description,
  icon,
  tone = "teal",
  href,
}: {
  label: string;
  value: number | null;
  description?: string;
  icon?: ReactNode;
  tone?: "teal" | "blue" | "amber" | "green";
  href?: string;
}) {
  const toneClass = {
    teal: "bg-teal-soft text-teal-ink",
    blue: "bg-info-soft text-info",
    amber: "bg-warning-soft text-warning",
    green: "bg-success-soft text-success",
  }[tone];
  const content = (
    <Card
      data-panel
      className={cn(
        "h-full rounded-xl border-0 bg-card py-0 shadow-[var(--panel-shadow)] ring-0",
        href &&
          "transition-[background-color,box-shadow] group-hover:bg-surface-hover group-hover:shadow-md",
      )}
    >
      <CardContent className="grid gap-5 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <span
            className={cn("grid size-11 place-items-center rounded-xl [&_svg]:size-5", toneClass)}
          >
            {icon}
          </span>
          {href && (
            <ArrowUpRight
              aria-hidden
              className="size-4 text-muted-foreground transition-colors group-hover:text-primary"
            />
          )}
        </div>
        <div>
          <p className="font-heading text-[34px] leading-none font-bold tracking-tight tabular-nums">
            {value === null ? "Unavailable" : value.toLocaleString("en-PH")}
          </p>
          <p className="mt-3 text-sm font-semibold">{label}</p>
          {description && (
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="group block min-w-0 rounded-xl outline-offset-4">
      {content}
    </Link>
  ) : (
    content
  );
}
