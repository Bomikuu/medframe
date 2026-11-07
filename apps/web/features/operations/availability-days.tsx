"use client";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { DurationChoice } from "./duration-choice";

export const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export type AvailabilityDay = {
  enabled: boolean;
  opens: string;
  closes: string;
  duration: string;
  id?: string;
  version?: number;
};

/** Presentation only: the weekly form owns validation, versions and persistence. */
export function AvailabilityDays({
  days,
  update,
}: {
  days: AvailabilityDay[];
  update: (index: number, change: Partial<AvailabilityDay>) => void;
}) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border px-4">
      {days.map((day, index) => (
        <section key={weekdays[index]} className="grid min-w-0 gap-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={`weekly-day-${index}`} className="text-sm font-semibold">
              {weekdays[index]}
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {day.enabled ? "Included in save" : "Not selected"}
              </span>
              <Switch
                id={`weekly-day-${index}`}
                checked={day.enabled}
                onCheckedChange={(enabled) => update(index, { enabled })}
              />
            </div>
          </div>
          {day.enabled && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <FormField id={`weekly-open-${index}`} label="Opens">
                <Input
                  id={`weekly-open-${index}`}
                  type="time"
                  value={day.opens}
                  onChange={(event) => update(index, { opens: event.target.value })}
                />
              </FormField>
              <FormField id={`weekly-close-${index}`} label="Closes">
                <Input
                  id={`weekly-close-${index}`}
                  type="time"
                  value={day.closes}
                  onChange={(event) => update(index, { closes: event.target.value })}
                />
              </FormField>
              <DurationChoice
                id={`weekly-duration-${index}`}
                label="Default visit duration"
                value={day.duration}
                change={(duration) => update(index, { duration })}
              />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
