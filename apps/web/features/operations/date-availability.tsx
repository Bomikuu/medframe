"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { writtenDate } from "@/components/application/date-input";
import { useSafety, useUnsavedChanges } from "@/features/workspace/safety-provider";
import { useCallback } from "react";
import { OverridePreview } from "./override-preview";
import { OperationNotice } from "./controls";
import { ScheduleSection } from "./schedule-section";
import { DateAvailabilityFields, DateAvailabilityList } from "./date-availability-fields";
import { useOperationsAction } from "./use-operations";
import { localDate, type OperationsSetup } from "./schema";

export function DateAvailability({
  setup,
  reload,
}: {
  setup: OperationsSetup;
  reload: () => void;
}) {
  const [date, setDate] = useState(localDate(setup.timezone));
  const [provider, setProvider] = useState("branch");
  const initial = setup.overrides.find(
    (row) => row.date === localDate(setup.timezone) && !row.provider_id,
  );
  const [available, setAvailable] = useState(initial ? !initial.closed : true);
  const [opens, setOpens] = useState(initial?.opens?.slice(0, 5) ?? "09:00");
  const [closes, setCloses] = useState(initial?.closes?.slice(0, 5) ?? "17:00");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const { confirm, guard } = useSafety();
  const action = useOperationsAction();
  const reset = useCallback(() => setDirty(false), []);
  useUnsavedChanges(`date-availability:${setup.branch_id}`, dirty, reset);
  function choose(nextDate: string, nextProvider: string) {
    const existing = setup.overrides.find(
      (row) =>
        row.date === nextDate &&
        row.provider_id === (nextProvider === "branch" ? null : nextProvider),
    );
    setDate(nextDate);
    setProvider(nextProvider);
    setAvailable(existing ? !existing.closed : true);
    setOpens(existing?.opens?.slice(0, 5) ?? "09:00");
    setCloses(existing?.closes?.slice(0, 5) ?? "17:00");
    setDirty(false);
    setError("");
  }
  return (
    <ScheduleSection
      id="date-overrides"
      title="Custom availability for a specific date"
      icon={CalendarDays}
      description="Override the weekly pattern for one day. A branch-wide closure takes precedence over provider hours."
    >
      <div className="px-5 py-5 sm:px-6">
        <OperationNotice error={error || action.error} message={action.message} />
        <form
          noValidate
          className="grid min-w-0 gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            if (!date || (available && (!opens || !closes || opens >= closes))) {
              setError("Choose a date and make the closing time later than opening.");
              return;
            }
            const existing = setup.overrides.find(
              (row) =>
                row.date === date && row.provider_id === (provider === "branch" ? null : provider),
            );
            if (
              !(await confirm({
                title: `Save ${writtenDate(date)} availability?`,
                description: available
                  ? `${opens}–${closes} will replace the weekly hours for this scope on this date. Existing reservations must remain covered.`
                  : "This scope will be closed for this date. The server rejects conflicts with existing reservations.",
                action: "Save date override",
              }))
            )
              return;
            await action.run(
              "override",
              {
                branch_id: setup.branch_id,
                provider_id: provider === "branch" ? null : provider,
                date,
                closed: !available,
                ...(available ? { opens, closes } : {}),
                ...(existing ? { id: existing.id, expected_version: existing.version } : {}),
              },
              () => {
                setDirty(false);
                reload();
              },
            );
          }}
        >
          <DateAvailabilityFields
            setup={setup}
            preview={
              <OverridePreview
                data={{
                  branch_id: setup.branch_id,
                  provider_id: provider === "branch" ? null : provider,
                  date,
                  closed: !available,
                  ...(available ? { opens, closes } : {}),
                }}
              />
            }
            date={date}
            provider={provider}
            available={available}
            opens={opens}
            closes={closes}
            busy={action.busy}
            changeDate={(value) => void guard(() => choose(value, provider))}
            changeProvider={(value) => void guard(() => choose(date, value))}
            changeAvailable={(value) => {
              setAvailable(value);
              setDirty(true);
            }}
            changeOpens={(value) => {
              setOpens(value);
              setDirty(true);
            }}
            changeCloses={(value) => {
              setCloses(value);
              setDirty(true);
            }}
          />
        </form>
        <DateAvailabilityList
          setup={setup}
          choose={(nextDate, nextProvider) => void guard(() => choose(nextDate, nextProvider))}
        />
      </div>
    </ScheduleSection>
  );
}
