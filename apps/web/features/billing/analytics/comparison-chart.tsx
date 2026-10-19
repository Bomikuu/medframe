"use client";

import { useId, useState } from "react";
import { money, type FinancialCurrency } from "./schema";
import { dateLabel } from "@/features/patients/feedback";

export function ComparisonChart({ value }: { value: FinancialCurrency }) {
  const id = useId();
  const [index, setIndex] = useState(value.series.length - 1);
  const current = value.series.map((row) => Number(row.net));
  const previous = value.previous_series.map((row) => Number(row.net));
  const low = Math.min(0, ...current, ...previous);
  const high = Math.max(1, ...current, ...previous);
  const x = (i: number) => 65 + (i * 555) / Math.max(1, current.length - 1);
  const y = (amount: number) => 175 - ((amount - low) * 150) / (high - low);
  const line = (points: number[]) =>
    points.map((amount, i) => `${i ? "L" : "M"}${x(i)},${y(amount)}`).join(" ");
  const selected = Math.min(index, value.series.length - 1);
  const point = value.series[selected];
  const old = value.previous_series[selected];
  if (!point || !old)
    return <p className="py-8 text-sm text-muted-foreground">No comparison data available.</p>;
  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Net recorded payments</h3>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-5 bg-primary" />
            Current
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 border-t-2 border-dashed border-muted-foreground" />
            Previous
          </span>
        </div>
      </div>
      <svg
        viewBox="0 0 640 210"
        className="w-full overflow-visible"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
      >
        <title id={`${id}-title`}>
          Recorded net payments compared with the previous equal period
        </title>
        <desc id={`${id}-description`}>
          Values are payments less refunds, by recorded payment date. Use the day slider or the data
          table for exact amounts. Dashed line shows the prior period.
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
                {money(amount, value.currency, true)}
              </text>
            </g>
          );
        })}
        <path
          d={line(previous)}
          fill="none"
          className="stroke-muted-foreground"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <path
          d={line(current)}
          fill="none"
          className="stroke-primary"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <line
          x1={x(selected)}
          x2={x(selected)}
          y1="20"
          y2="180"
          className="stroke-border"
          strokeDasharray="3 4"
        />
        <circle
          cx={x(selected)}
          cy={y(current[selected])}
          r="4"
          className="fill-primary stroke-background"
          strokeWidth="2"
        />
        <text x="65" y="202" className="fill-muted-foreground text-[10px]">
          {dateLabel(value.series[0].date)}
        </text>
        <text x="620" y="202" textAnchor="end" className="fill-muted-foreground text-[10px]">
          {dateLabel(value.series.at(-1)!.date)}
        </text>
      </svg>
      <label className="mt-2 block text-xs font-medium text-muted-foreground" htmlFor={`${id}-day`}>
        Inspect day {selected + 1} of {value.series.length}
      </label>
      <input
        id={`${id}-day`}
        className="mt-2 h-8 w-full accent-primary"
        type="range"
        min={0}
        max={value.series.length - 1}
        value={selected}
        onChange={(event) => setIndex(Number(event.target.value))}
      />
      <div
        className="grid gap-2 rounded-lg bg-muted/50 p-3 text-xs leading-5 tabular-nums sm:grid-cols-2"
        aria-live="polite"
      >
        <p>
          {dateLabel(point.date)}
          <strong className="ml-2 text-foreground">{money(point.net, value.currency)}</strong>
        </p>
        <p>
          {dateLabel(old.date)}
          <strong className="ml-2 text-foreground">{money(old.net, value.currency)}</strong>
        </p>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer py-2 font-medium text-muted-foreground">
          View comparison data
        </summary>
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left tabular-nums">
            <caption className="sr-only">Net payments by current and comparison date</caption>
            <thead>
              <tr>
                {["Date", "Net payments", "Previous date", "Previous net"].map((label) => (
                  <th key={label} className="px-2 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {value.series.map((row, i) => (
                <tr key={row.date} className="border-t border-border">
                  <td className="px-2 py-2">{row.date}</td>
                  <td className="px-2 py-2">{money(row.net, value.currency)}</td>
                  <td className="px-2 py-2">{value.previous_series[i].date}</td>
                  <td className="px-2 py-2">
                    {money(value.previous_series[i].net, value.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
