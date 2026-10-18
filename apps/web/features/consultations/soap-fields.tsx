"use client";

import { useFormContext } from "react-hook-form";
import { FormField } from "@/components/form-field";
import { Textarea } from "@/components/ui/textarea";
import type { EncounterForm } from "./schema";

export function SoapFields({ readOnly }: { readOnly: boolean }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<EncounterForm>();
  return (
    <section aria-labelledby="soapHeading" className="grid gap-6">
      <div>
        <h2 id="soapHeading" className="text-xl font-semibold">
          Consultation notes
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Keep patient reports, observations, assessment, and care plans distinct.
        </p>
      </div>
      <div className="grid gap-4 2xl:grid-cols-2">
        {(
          [
            ["subjective", "Subjective", "The patient's concerns and reported symptoms."],
            ["objective", "Objective", "Findings and observations recorded during this visit."],
            [
              "assessment",
              "Assessment",
              "Your clinical assessment. Record diagnosis certainty below.",
            ],
            ["plan", "Plan", "Discussed next steps, monitoring, and proposed care."],
          ] as const
        ).map(([key, label, hint]) => (
          <FormField
            key={key}
            id={`soap-${key}`}
            label={label}
            hint={hint}
            error={errors.content?.soap?.[key]?.message}
          >
            <Textarea
              id={`soap-${key}`}
              {...register(`content.soap.${key}`)}
              readOnly={readOnly}
              maxLength={6000}
              aria-invalid={!!errors.content?.soap?.[key]}
              aria-describedby={`soap-${key}-help`}
              className="min-h-32 resize-y"
            />
          </FormField>
        ))}
      </div>
    </section>
  );
}
