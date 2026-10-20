import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { dateLabel } from "@/features/patients/feedback";
import type { Metric } from "./schema";

export function ReportTable({ title, value }: { title: string; value: Metric }) {
  const max = Math.max(1, ...value.series.map((point) => point.count));
  const points = value.series
    .map(
      (point, i) =>
        `${(i / Math.max(1, value.series.length - 1)) * 800},${100 - (point.count / max) * 88}`,
    )
    .join(" ");
  return (
    <div className="mt-6 grid min-w-0 gap-4">
      <figure className="min-w-0 rounded-lg bg-muted/40 p-4">
        <figcaption className="mb-3 text-xs font-medium">{title} · Daily count</figcaption>
        <svg
          viewBox="0 0 800 110"
          className="h-28 w-full text-teal-ink"
          role="img"
          aria-label={`${title} daily counts, from 0 to ${max}. Exact values below.`}
        >
          <path d="M0 100 H800" stroke="currentColor" opacity="0.2" />
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <p className="mt-2 text-xs text-muted-foreground">
          Scale 0–{max}. Descriptive counts, not an outcome measure.
        </p>
      </figure>
      <details className="min-w-0">
        <summary className="min-h-11 cursor-pointer text-sm font-medium">
          View exact daily counts
        </summary>
        <div className="max-h-80 overflow-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {value.series.map((row) => (
                <TableRow key={row.date}>
                  <TableCell>{dateLabel(row.date)}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </div>
  );
}
