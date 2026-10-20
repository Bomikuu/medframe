import type { Metric } from "./schema";

export function MetricComparison({ title, value }: { title: string; value: Metric }) {
  const delta = value.current - value.previous;
  const change =
    value.previous === 0
      ? value.current === 0
        ? "No change"
        : "No prior baseline"
      : `${delta > 0 ? "+" : ""}${((delta / value.previous) * 100).toFixed(1)}% vs previous period`;
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-3 text-3xl font-semibold tabular-nums">{value.current.toLocaleString()}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {change} · Previously {value.previous}
      </p>
      {value.distinct_current !== undefined && (
        <p className="mt-2 text-xs text-muted-foreground">
          {value.distinct_current} distinct scheduled patients · Previously{" "}
          {value.distinct_previous}
        </p>
      )}
      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-3 text-xs">
        {value.statuses.map((row) => (
          <div key={row.label} className="flex gap-2">
            <dt className="text-muted-foreground capitalize">{row.label.replaceAll("_", " ")}</dt>
            <dd className="font-medium tabular-nums">{row.count}</dd>
          </div>
        ))}
        {!value.statuses.length && (
          <p className="text-muted-foreground">No activity in this period.</p>
        )}
      </dl>
    </div>
  );
}
