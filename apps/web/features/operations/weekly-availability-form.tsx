"use client";

import { useCallback, useState } from "react";
import { Repeat2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateInput, writtenDate } from "@/components/application/date-input";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { localDate, type OperationsSetup } from "./schema";
import { shiftDay } from "./calendar-dates";
import { OperationNotice } from "./controls";
import { useOperationsAction } from "./use-operations";

export { weekdays } from "./availability-days";
import { AvailabilityDays, weekdays, type AvailabilityDay } from "./availability-days";
type Schedule = OperationsSetup["schedules"][number];

export function WeeklyAvailabilityForm({
  setup,
  initial,
  providerId,
  saved,
}: {
  setup: OperationsSetup;
  initial?: Schedule;
  providerId?: string;
  saved: () => void;
}) {
  const [seed] = useState(() => ({
    provider: initial?.provider_id ?? providerId ?? setup.providers[0]?.id ?? "",
    from: initial?.effective_from ?? localDate(setup.timezone),
    to: initial?.effective_to ?? shiftDay(localDate(setup.timezone), 365),
    days: weekdays.map((_, weekday): AvailabilityDay => {
      const candidates = initial
        ? setup.schedules.filter(
            (row) =>
              row.provider_id === initial.provider_id &&
              row.weekday === weekday &&
              row.effective_from === initial.effective_from &&
              row.effective_to === initial.effective_to &&
              row.active,
          )
        : [];
      const row =
        initial?.weekday === weekday
          ? initial
          : candidates.length === 1
            ? candidates[0]
            : undefined;
      return row
        ? {
            enabled: row.active,
            opens: row.opens.slice(0, 5),
            closes: row.closes.slice(0, 5),
            duration: String(row.duration),
            id: row.id,
            version: row.version,
          }
        : { enabled: false, opens: "09:00", closes: "17:00", duration: "30" };
    }),
  }));
  const [values, setValues] = useState(seed);
  const [error, setError] = useState("");
  const action = useOperationsAction();
  const reset = useCallback(() => setValues(seed), [seed]);
  useUnsavedChanges(
    `weekly-availability:${setup.branch_id}:${initial?.id ?? "new"}`,
    JSON.stringify(values) !== JSON.stringify(seed),
    reset,
  );
  const updateDay = (index: number, change: Partial<AvailabilityDay>) =>
    setValues((previous) => ({
      ...previous,
      days: previous.days.map((day, position) =>
        position === index ? { ...day, ...change } : day,
      ),
    }));
  const selected = values.days.filter((day) => day.enabled).length;
  return (
    <form
      noValidate
      className="grid min-w-0 gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        if (!values.provider || !values.from || !values.to || values.from > values.to) {
          setError("Choose a provider and an ordered effective date range.");
          return;
        }
        if (!selected) {
          setError("Turn on at least one weekday.");
          return;
        }
        const invalid = values.days.findIndex(
          (day) =>
            day.enabled &&
            (!day.opens ||
              !day.closes ||
              day.opens >= day.closes ||
              !Number.isInteger(Number(day.duration)) ||
              Number(day.duration) < 5 ||
              Number(day.duration) > 240 ||
              Number(day.duration) % 5 !== 0),
        );
        if (invalid !== -1) {
          setError(
            `${weekdays[invalid]} needs ordered opening hours and a duration of 5–240 minutes in steps of 5.`,
          );
          return;
        }
        const success = await action.run(
          "weekly_schedule",
          {
            branch_id: setup.branch_id,
            provider_id: values.provider,
            windows: values.days.flatMap((day, weekday) =>
              day.enabled
                ? [
                    {
                      branch_id: setup.branch_id,
                      provider_id: values.provider,
                      weekday,
                      effective_from: values.from,
                      effective_to: values.to,
                      opens: day.opens,
                      closes: day.closes,
                      duration: Number(day.duration),
                      ...(day.id ? { id: day.id, expected_version: day.version } : {}),
                    },
                  ]
                : [],
            ),
          },
          () => {},
        );
        if (success) {
          reset();
          saved();
        }
      }}
    >
      <OperationNotice error={error || action.error} message={action.message} />
      <fieldset disabled={action.busy} className="grid gap-5">
        <FormSelect
          id="weekly-provider"
          label="Provider"
          value={values.provider}
          disabled={!!initial}
          onChange={(provider) => setValues((previous) => ({ ...previous, provider }))}
          options={setup.providers.map((provider) => ({
            value: provider.id,
            label: provider.name,
            person: { kind: "provider" as const, name: provider.name, imageId: provider.photo_id },
          }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="weekly-from" label="Repeats from">
            <DateInput
              id="weekly-from"
              required
              value={values.from}
              onChange={(event) =>
                setValues((previous) => ({ ...previous, from: event.target.value }))
              }
            />
          </FormField>
          <FormField id="weekly-to" label="Repeats through">
            <DateInput
              id="weekly-to"
              required
              value={values.to}
              min={values.from}
              onChange={(event) =>
                setValues((previous) => ({ ...previous, to: event.target.value }))
              }
            />
          </FormField>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-teal-50 p-4 text-teal-950">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Repeat2 aria-hidden className="size-4" />
            Repeats every week
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setValues((previous) => ({
                ...previous,
                days: previous.days.map((day, index) => ({ ...day, enabled: index < 5 })),
              }))
            }
          >
            Select Monday–Friday
          </Button>
          <p className="w-full text-xs leading-5">
            {writtenDate(values.from)} – {writtenDate(values.to)}. Each enabled day can have
            different hours. Unselected days and other saved windows stay unchanged.
          </p>
        </div>
        <AvailabilityDays days={values.days} update={updateDay} />
        <p className="text-xs leading-5 text-muted-foreground">
          All selected days save together. Conflicts preserve the entire previous schedule. For
          split shifts, add a separate window with non-overlapping hours. A specific-date override
          can replace this pattern for that date.
        </p>
        <Button type="submit" disabled={action.busy || !setup.providers.length}>
          <Save aria-hidden className="size-4" />
          {action.busy
            ? "Saving weekly availability…"
            : `Save ${selected || "selected"} weekday${selected === 1 ? "" : "s"}`}
        </Button>
      </fieldset>
    </form>
  );
}
