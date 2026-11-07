"use client";

import { useId, useState } from "react";
import { dateLabel } from "@/features/patients/feedback";

export type ComparisonPoint = { date: string; value: number };

export function PeriodComparisonChart({
  title,
  current,
  previous,
  formatValue = (value) => value.toLocaleString("en-PH"),
  formatAxis = formatValue,
}: {
  title: string;
  current: ComparisonPoint[];
  previous: ComparisonPoint[];
  formatValue?: (value: number) => string;
  formatAxis?: (value: number) => string;
}) {
  const id = useId();
  const [index, setIndex] = useState(current.length - 1);
  const selected = Math.max(0, Math.min(index, current.length - 1));
  const point = current[selected];
  const old = previous[selected];
  if (!point || !old || current.length !== previous.length)
    return <p className="py-8 text-sm text-muted-foreground">No date comparison available.</p>;

  const quiet =
    current.every((point) => point.value === 0) && previous.every((point) => point.value === 0);
  const low = Math.min(0, ...current.map((p) => p.value), ...previous.map((p) => p.value));
  const high = Math.max(1, ...current.map((p) => p.value), ...previous.map((p) => p.value));
  const x = (i: number) => 65 + (i * 555) / Math.max(1, current.length - 1);
  const y = (value: number) => 180 - ((value - low) * 150) / (high - low);
  const path = (values: ComparisonPoint[]) =>
    values.map((row, i) => `${i ? "L" : "M"}${x(i)},${y(row.value)}`).join(" ");
  const span = (values: ComparisonPoint[]) =>
    `${dateLabel(values[0].date)} – ${dateLabel(values.at(-1)!.date)}`;

  return (
    <section className="min-w-0" aria-labelledby={`${id}-heading`}>
      <h3 id={`${id}-heading`} className="text-sm font-semibold">
        {title}
      </h3>
      <div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
        <p className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-5 shrink-0 bg-teal-ink" />
          <span>Selected · {span(current)}</span>
        </p>
        <p className="flex items-center gap-2">
          <span
            aria-hidden
            className="w-5 shrink-0 border-t-2 border-dashed border-muted-foreground"
          />
          <span>Previous · {span(previous)}</span>
        </p>
      </div>
      {quiet ? (
        <p className="my-4 rounded-lg bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
          No recorded activity in either period. Exact daily values remain available below.
        </p>
      ) : (
        <svg
          viewBox="0 0 640 220"
          className="mt-3 w-full overflow-visible"
          role="img"
          aria-labelledby={`${id}-title ${id}-description`}
          onPointerMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const chartX = ((event.clientX - bounds.left) / bounds.width) * 640;
            setIndex(
              Math.max(
                0,
                Math.min(
                  current.length - 1,
                  Math.round(((chartX - 65) / 555) * (current.length - 1)),
                ),
              ),
            );
          }}
        >
          <title id={`${id}-title`}>{title}: selected dates compared with previous dates</title>
          <desc id={`${id}-description`}>
            Solid teal shows the selected period. Dashed gray shows the previous equal period,
            aligned by day of period. Inspect exact dates and values using the slider or table.
          </desc>
          {[0, 0.5, 1].map((fraction) => {
            const amount = low + (high - low) * fraction;
            return (
              <g key={fraction}>
                <line x1="65" x2="620" y1={y(amount)} y2={y(amount)} className="stroke-border" />
                <text
                  x="55"
                  y={y(amount) + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px]"
                >
                  {formatAxis(amount)}
                </text>
              </g>
            );
          })}
          <path
            d={path(previous)}
            fill="none"
            className="stroke-muted-foreground"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
          <path
            d={path(current)}
            fill="none"
            className="stroke-teal-ink"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <line
            x1={x(selected)}
            x2={x(selected)}
            y1="25"
            y2="185"
            className="stroke-border"
            strokeDasharray="3 4"
          />
          <circle
            cx={x(selected)}
            cy={y(old.value)}
            r="4"
            className="fill-background stroke-muted-foreground"
            strokeWidth="2"
          />
          <circle
            cx={x(selected)}
            cy={y(point.value)}
            r="4"
            className="fill-teal-ink stroke-background"
            strokeWidth="2"
          />
          <text x="65" y="210" className="fill-muted-foreground text-[10px]">
            {dateLabel(current[0].date)}
          </text>
          <text x="620" y="210" textAnchor="end" className="fill-muted-foreground text-[10px]">
            {dateLabel(current.at(-1)!.date)}
          </text>
        </svg>
      )}
      <label htmlFor={`${id}-day`} className="mt-2 block text-xs font-medium text-muted-foreground">
        Inspect comparison day {selected + 1} of {current.length}
      </label>
      <input
        id={`${id}-day`}
        type="range"
        min={0}
        max={current.length - 1}
        value={selected}
        onChange={(event) => setIndex(Number(event.target.value))}
        className="mt-1 h-9 w-full accent-teal-ink"
      />
      <div
        className="grid gap-3 rounded-lg bg-muted/50 p-4 text-xs leading-5 tabular-nums sm:grid-cols-2"
        aria-live="polite"
      >
        <p>
          Selected · {dateLabel(point.date)}
          <strong className="mt-1 block text-sm text-foreground">{formatValue(point.value)}</strong>
        </p>
        <p>
          Previous · {dateLabel(old.date)}
          <strong className="mt-1 block text-sm text-foreground">{formatValue(old.value)}</strong>
        </p>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer py-3 font-medium text-muted-foreground">
          View exact comparison data
        </summary>
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left tabular-nums">
            <caption className="sr-only">
              {title}: exact current and previous dates and values
            </caption>
            <thead>
              <tr>
                {["Selected date", "Value", "Previous date", "Value"].map((label, i) => (
                  <th key={i} scope="col" className="px-2 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.map((row, i) => (
                <tr key={row.date} className="border-t border-border">
                  <td className="px-2 py-2 whitespace-nowrap">{dateLabel(row.date)}</td>
                  <td className="px-2 py-2">{formatValue(row.value)}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{dateLabel(previous[i].date)}</td>
                  <td className="px-2 py-2">{formatValue(previous[i].value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
