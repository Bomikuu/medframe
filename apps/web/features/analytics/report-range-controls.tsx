"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/application/date-input";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";

export type ReportRange = { days?: number; startDate?: string; endDate?: string };
function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function ReportRangeControls({
  id,
  range,
  timezone,
  currentFrom,
  currentTo,
  onApply,
  onPendingChange,
  compact = false,
}: {
  id: string;
  range: ReportRange;
  timezone: string;
  currentFrom?: string;
  currentTo?: string;
  onApply: (range: ReportRange) => void;
  onPendingChange?: (pending: boolean) => void;
  compact?: boolean;
}) {
  const [mode, setMode] = useState(range.startDate ? "custom" : String(range.days ?? 30));
  const [start, setStart] = useState(range.startDate ?? "");
  const [end, setEnd] = useState(range.endDate ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const lastCompleted = shiftDate(today, -1);
  function markPending(value: boolean) {
    setPending(value);
    onPendingChange?.(value);
  }
  return (
    <form
      noValidate
      className="grid min-w-0 gap-3"
      aria-label="Report date range"
      onSubmit={(event) => {
        event.preventDefault();
        const first = Date.parse(`${start}T00:00:00Z`);
        const last = Date.parse(`${end}T00:00:00Z`);
        const days = (last - first) / 86400000 + 1;
        if (!start || !end || !Number.isFinite(days) || days < 1 || days > 366 || end >= today) {
          setError("Choose both dates: 1–366 completed clinic days, ending before today.");
          return;
        }
        setError("");
        markPending(false);
        onApply({ startDate: start, endDate: end });
      }}
    >
      <FormSelect
        id={`${id}-period`}
        label="Comparison period"
        value={mode}
        onChange={(value) => {
          setMode(value);
          setError("");
          if (value === "custom") {
            setStart(range.startDate ?? currentFrom ?? shiftDate(lastCompleted, -29));
            setEnd(range.endDate ?? currentTo ?? lastCompleted);
            markPending(true);
          } else {
            markPending(false);
            onApply({ days: Number(value) });
          }
        }}
        options={[
          ...[7, 30, 90].map((days) => ({
            value: String(days),
            label: `Last ${days} completed days`,
          })),
          ...(!compact ? [{ value: "custom", label: "Custom dates" }] : []),
        ]}
      />
      {mode === "custom" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id={`${id}-from`} label="From date">
              <DateInput
                id={`${id}-from`}
                max={lastCompleted}
                value={start}
                onChange={(event) => {
                  setStart(event.target.value);
                  markPending(true);
                  setError("");
                }}
              />
            </FormField>
            <FormField id={`${id}-to`} label="Through date">
              <DateInput
                id={`${id}-to`}
                max={lastCompleted}
                value={end}
                onChange={(event) => {
                  setEnd(event.target.value);
                  markPending(true);
                  setError("");
                }}
              />
            </FormField>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Both dates included · 1–366 days · {timezone}. Compared with the immediately preceding
            equal-length period.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="outline">
              Apply custom dates
            </Button>
            {pending && (
              <p role="status" className="text-xs text-muted-foreground">
                Dates not applied. The current report is unchanged.
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </>
      )}
    </form>
  );
}
