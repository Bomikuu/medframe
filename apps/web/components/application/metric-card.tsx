import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
export function MetricCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number | null;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <Card data-panel className="rounded-lg border border-border py-5 ring-0">
      <CardContent className="px-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
        </div>
        <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
          {value === null ? "Unavailable" : value.toLocaleString("en-PH")}
        </p>
        {description && (
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
