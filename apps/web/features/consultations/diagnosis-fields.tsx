"use client";

import { ClinicalEntry } from "@/components/application/clinical-entry";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import type { EncounterForm } from "./schema";

export function DiagnosisFields({
  readOnly,
  observationLabels = [],
}: {
  readOnly: boolean;
  observationLabels?: string[];
}) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<EncounterForm>();
  const diagnoses = useFieldArray({ control, name: "content.diagnoses" });
  const values = useWatch({ control, name: "content.diagnoses" });
  const observations = useFieldArray({ control, name: "content.observations" });
  const observationValues = useWatch({ control, name: "content.observations" });
  return (
    <div className="grid gap-8">
      <section aria-labelledby="diagnosesHeading">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="diagnosesHeading" className="text-xl font-semibold">
            Diagnoses
          </h2>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              disabled={diagnoses.fields.length >= 20}
              onClick={() =>
                diagnoses.append({ description: "", certainty: "suspected", code: "" })
              }
            >
              Add diagnosis
            </Button>
          )}
        </div>
        {!diagnoses.fields.length && (
          <p className="text-sm text-muted-foreground">
            No diagnosis recorded. Symptoms do not automatically become diagnoses.
          </p>
        )}
        <div className="grid gap-5">
          {diagnoses.fields.map((field, index) => (
            <ClinicalEntry
              key={field.id}
              title={`Diagnosis ${index + 1}`}
              summary={values[index]?.description ?? ""}
              status={values[index]?.certainty ?? "unreviewed"}
              path={`content.diagnoses.${index}`}
              readOnly={readOnly}
              onRemove={() => diagnoses.remove(index)}
            >
              <div className="grid gap-4">
                <FormField
                  id={`diagnosis-${index}`}
                  label={`Diagnosis ${index + 1}`}
                  error={errors.content?.diagnoses?.[index]?.description?.message}
                >
                  <Input
                    id={`diagnosis-${index}`}
                    {...register(`content.diagnoses.${index}.description`)}
                    maxLength={240}
                    aria-invalid={!!errors.content?.diagnoses?.[index]?.description}
                    aria-describedby={
                      errors.content?.diagnoses?.[index]?.description
                        ? `diagnosis-${index}-help`
                        : undefined
                    }
                  />
                </FormField>
                <FormSelect
                  id={`certainty-${index}`}
                  label="Certainty"
                  value={values[index]?.certainty ?? "suspected"}
                  onChange={(value) =>
                    setValue(
                      `content.diagnoses.${index}.certainty`,
                      value as EncounterForm["content"]["diagnoses"][number]["certainty"],
                      { shouldDirty: true },
                    )
                  }
                  options={["reported", "observed", "suspected", "confirmed", "resolved"].map(
                    (value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }),
                  )}
                />
                <FormField id={`code-${index}`} label="Terminology code (optional)">
                  <Input
                    id={`code-${index}`}
                    {...register(`content.diagnoses.${index}.code`)}
                    maxLength={40}
                  />
                </FormField>
                {!readOnly && (
                  <Button type="button" variant="ghost" onClick={() => diagnoses.remove(index)}>
                    Remove diagnosis {index + 1}
                  </Button>
                )}
              </div>
            </ClinicalEntry>
          ))}
        </div>
      </section>
      <section aria-labelledby="observationsHeading">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="observationsHeading" className="text-xl font-semibold">
            Structured observations
          </h2>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              disabled={observations.fields.length >= 30}
              onClick={() => observations.append({ label: "", value: "", source: "observed" })}
            >
              Add observation
            </Button>
          )}
        </div>
        {!readOnly && observationLabels.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2" aria-label="Optional observation labels">
            {observationLabels.map((label, index) => (
              <Button
                key={`${label}:${index}`}
                type="button"
                variant="outline"
                disabled={observations.fields.length >= 30}
                onClick={() => observations.append({ label, value: "", source: "observed" })}
              >
                Add {label} observation
              </Button>
            ))}
          </div>
        )}
        {!observations.fields.length && (
          <p className="text-sm text-muted-foreground">No structured observations recorded.</p>
        )}
        <div className="grid gap-5">
          {observations.fields.map((field, index) => (
            <ClinicalEntry
              key={field.id}
              title={`Observation ${index + 1}`}
              summary={observationValues[index]?.label ?? ""}
              status={observationValues[index]?.source ?? "observed"}
              path={`content.observations.${index}`}
              readOnly={readOnly}
              onRemove={() => observations.remove(index)}
            >
              <div className="grid gap-4">
                <FormField id={`observation-label-${index}`} label="Observation">
                  <Input
                    id={`observation-label-${index}`}
                    {...register(`content.observations.${index}.label`)}
                    maxLength={120}
                  />
                </FormField>
                <FormField id={`observation-value-${index}`} label="Recorded value">
                  <Input
                    id={`observation-value-${index}`}
                    {...register(`content.observations.${index}.value`)}
                    maxLength={240}
                  />
                </FormField>
                <FormSelect
                  id={`observation-source-${index}`}
                  label="Source"
                  value={observationValues[index]?.source ?? "observed"}
                  onChange={(value) =>
                    setValue(
                      `content.observations.${index}.source`,
                      value as "reported" | "observed",
                      { shouldDirty: true },
                    )
                  }
                  options={[
                    { value: "reported", label: "Patient-reported" },
                    { value: "observed", label: "Clinician-observed" },
                  ]}
                />
                {!readOnly && (
                  <Button type="button" variant="ghost" onClick={() => observations.remove(index)}>
                    Remove observation {index + 1}
                  </Button>
                )}
              </div>
            </ClinicalEntry>
          ))}
        </div>
      </section>
    </div>
  );
}
