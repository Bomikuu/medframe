"use client";

import { useState } from "react";
import { FormSelect } from "@/features/patients/form-controls";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";

const suggestions = [15, 20, 30, 45, 60, 90, 120];

export function DurationChoice({
  id,
  label = "Visit duration",
  value,
  change,
  error,
}: {
  id: string;
  label?: string;
  value: string;
  change: (value: string) => void;
  error?: string;
}) {
  const [custom, setCustom] = useState(false);
  const other = custom || !suggestions.includes(Number(value));
  return (
    <div className="grid gap-3">
      <FormSelect
        id={id}
        label={label}
        value={other ? "other" : value}
        error={error}
        onChange={(next) => {
          setCustom(next === "other");
          if (next !== "other") change(next);
        }}
        options={[
          ...suggestions.map((minutes) => ({
            value: String(minutes),
            label:
              minutes < 60
                ? `${minutes} minutes`
                : minutes === 60
                  ? "1 hour"
                  : minutes === 90
                    ? "1 hour 30 minutes"
                    : "2 hours",
          })),
          { value: "other", label: "Other duration…" },
        ]}
      />
      {other && (
        <FormField
          id={`${id}-other`}
          label="Custom minutes"
          hint="5–240 minutes, in steps of 5."
          error={error}
        >
          <Input
            id={`${id}-other`}
            type="number"
            inputMode="numeric"
            min={5}
            max={240}
            step={5}
            value={value}
            onChange={(event) => change(event.target.value)}
            aria-invalid={!!error}
          />
        </FormField>
      )}
    </div>
  );
}
