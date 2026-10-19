"use client";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Choice } from "./field";
import type { Fields } from "./schema";
export function PracticeStep() {
  const { watch, setValue } = useFormContext<Fields>();
  const days = (watch("days") as number[]) ?? [];
  return (
    <div className="space-y-8">
      <Field name="branch_name" label="Primary branch name" maxLength={160} />
      <section>
        <h2 className="mb-4 text-sm font-semibold">Operating days</h2>
        <div className="flex flex-wrap gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
            <Button
              key={day}
              type="button"
              variant={days.includes(index) ? "secondary" : "outline"}
              aria-pressed={days.includes(index)}
              onClick={() =>
                setValue(
                  "days",
                  days.includes(index) ? days.filter((value) => value !== index) : [...days, index],
                  { shouldDirty: true },
                )
              }
            >
              {day}
            </Button>
          ))}
        </div>
      </section>
      <div className="grid max-w-md gap-5 sm:grid-cols-2">
        <Field name="opens" label="Opening time" type="time" />
        <Field name="closes" label="Closing time" type="time" />
      </div>
      <Choice
        name="timezone"
        label="Clinic timezone"
        options={[...new Set(["Asia/Manila", ...Intl.supportedValuesOf("timeZone")])].map(
          (zone) => ({ value: zone, label: zone.replaceAll("_", " ") }),
        )}
      />
      <div className="max-w-64">
        <Field
          name="duration_minutes"
          label="Appointment length (minutes)"
          type="number"
          hint="15, 30, 45, 60, or a custom value from 5–240."
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
      <p className="rounded-lg bg-teal-50 p-4 text-xs leading-6 text-teal-900">
        These are your starting preferences. Configure individual provider availability and advanced
        schedules after setup.
      </p>
    </div>
  );
}
