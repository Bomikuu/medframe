"use client";

import { Button } from "@/components/ui/button";
import { FormSelect } from "@/features/patients/form-controls";
import type { Finding } from "@/features/consultations/schema";
import {
  dentalIllustration,
  IMPACTION_PRESETS,
  THIRD_MOLARS,
  type IllustrationGroup,
} from "./illustration";

export function IllustrationControls({
  tooth,
  findings,
  disabled,
  onChange,
}: {
  tooth: string;
  findings: Finding[];
  disabled: boolean;
  onChange: (group: IllustrationGroup, condition: string | null) => void;
}) {
  const state = dentalIllustration(findings, tooth);
  const permanent = /^[1-4][1-8]$/.test(tooth);
  return (
    <section aria-label="Tooth illustration" className="mb-5 border-y border-border py-4">
      <h3 className="text-sm font-semibold">Tooth illustration</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Record the current state. Changes save with this consultation; planned procedures do not
        change the model.
      </p>
      <fieldset disabled={disabled || !permanent} className="mt-3 grid gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["presence", state.missing, "Missing / extracted", "Missing tooth"],
              ["crown", state.crown, "Crown present", "Crown present"],
              ["bracket", state.bracket, "Braces bracket", "Orthodontic bracket present"],
            ] as const
          ).map(([group, pressed, label, condition]) => (
            <Button
              key={group}
              type="button"
              size="sm"
              variant={pressed ? "default" : "outline"}
              aria-pressed={pressed}
              onClick={() => onChange(group, pressed ? null : condition)}
              disabled={group !== "presence" && state.missing}
              className="min-h-11"
            >
              {label}
            </Button>
          ))}
        </div>
        {THIRD_MOLARS.includes(tooth) ? (
          <FormSelect
            id={`impaction-${tooth}`}
            label="Impacted tooth orientation"
            value={state.impaction ?? "upright"}
            onChange={(value) =>
              onChange(
                "impaction",
                IMPACTION_PRESETS.find((preset) => preset.value === value)?.condition ?? null,
              )
            }
            options={[
              { value: "upright", label: "Upright / clear impaction preset" },
              ...IMPACTION_PRESETS.map(({ value, label }) => ({ value, label })),
            ]}
            disabled={state.missing || disabled}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Impaction rotation presets are available on wisdom teeth 18, 28, 38 and 48.
          </p>
        )}
      </fieldset>
      <div
        className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"
        aria-label="Tooth illustration legend"
      >
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full bg-cyan-500" />
          Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full bg-red-600" />
          Missing reference
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full bg-amber-500" />
          Crown
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Schematic reference only. Crown coverage, bracket position and impaction angle are
        illustrative, not patient measurements.
      </p>
    </section>
  );
}
