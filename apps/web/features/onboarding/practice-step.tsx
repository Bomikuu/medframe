"use client";

import { useFormContext } from "react-hook-form";
import { Clock3 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Field, Choice } from "./field";
import { OnboardingNotice } from "./onboarding-notice";
import type { Fields } from "./schema";
export const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function PracticeStep() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<Fields>();
  const days = (watch("days") as number[]) ?? [];
  return (
    <div className="space-y-8">
      <Field name="branch_name" label="Primary branch name" maxLength={160} />
      <section aria-labelledby="operating-hours-title">
        <h2 id="operating-hours-title" className="flex items-center gap-2 text-base font-semibold">
          <Clock3 className="size-4 text-teal-700" aria-hidden="true" />
          Weekly opening hours
        </h2>
        <p className="mt-2 mb-5 text-sm leading-6 text-muted-foreground">
          Set hours for each day. Turn off any day your clinic is closed.
        </p>
        <div className="divide-y rounded-xl border px-4">
          {weekdays.map((day, index) => (
            <div key={day} className="grid gap-4 py-4 sm:grid-cols-[150px_1fr] sm:items-center">
              <div className="flex items-center justify-between gap-3 sm:justify-start">
                <Switch
                  id={`open-day-${index}`}
                  aria-label={`${day} open`}
                  checked={days.includes(index)}
                  onCheckedChange={(checked) =>
                    setValue(
                      "days",
                      checked ? [...days, index].sort() : days.filter((value) => value !== index),
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }
                />
                <label htmlFor={`open-day-${index}`} className="text-sm font-medium">
                  {day}
                </label>
              </div>
              {days.includes(index) ? (
                <div className="grid min-w-0 grid-cols-2 gap-3">
                  <Field name={`daily_hours.${index}.opens`} label={`${day} opens`} type="time" />
                  <Field name={`daily_hours.${index}.closes`} label={`${day} closes`} type="time" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Closed</p>
              )}
            </div>
          ))}
        </div>
        {errors.days && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {String(errors.days.message)}
          </p>
        )}
      </section>
      <div className="grid gap-5 sm:grid-cols-2">
        <Choice
          name="timezone"
          label="Clinic timezone"
          options={[...new Set(["Asia/Manila", ...Intl.supportedValuesOf("timeZone")])].map(
            (zone) => ({ value: zone, label: zone.replaceAll("_", " ") }),
          )}
        />
        <Field
          name="duration_minutes"
          label="Appointment length (minutes)"
          type="number"
          hint="A whole number from 5 to 240 minutes."
        />
      </div>
      <Choice
        name="walk_in_policy"
        label="Walk-in policy"
        options={[
          { value: "both", label: "Appointments and walk-ins" },
          { value: "appointments", label: "Appointments only" },
          { value: "walk_ins", label: "Accept walk-ins" },
        ]}
      />
      <OnboardingNotice>
        These hours are your clinic’s starting preferences. Add individual provider availability and
        appointment schedules after setup.
      </OnboardingNotice>
    </div>
  );
}
