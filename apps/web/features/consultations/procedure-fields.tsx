"use client";

import { ClinicalEntry } from "@/components/application/clinical-entry";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/features/patients/form-controls";
import type { EncounterForm } from "./schema";

export function ProcedureFields({ readOnly }: { readOnly: boolean }) {
  const { control, register, setValue } = useFormContext<EncounterForm>();
  const array = useFieldArray({ control, name: "content.procedures" });
  const values = useWatch({ control, name: "content.procedures" });
  return (
    <section aria-labelledby="proceduresHeading">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="proceduresHeading" className="text-xl font-semibold">
            Procedures
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Proposed care and completed care remain separate in the record.
          </p>
        </div>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            disabled={array.fields.length >= 30}
            onClick={() =>
              array.append({
                description: "",
                status: "proposed",
                tooth: "",
                surfaces: [],
                notes: "",
              })
            }
          >
            Add procedure
          </Button>
        )}
      </div>
      {!array.fields.length && (
        <p className="text-sm text-muted-foreground">No procedures recorded for this visit.</p>
      )}
      <div className="grid gap-5">
        {array.fields.map((field, index) => (
          <ClinicalEntry
            key={field.id}
            title={`Procedure ${index + 1}`}
            summary={values[index]?.description ?? ""}
            status={values[index]?.status ?? "unreviewed"}
            path={`content.procedures.${index}`}
            readOnly={readOnly}
            onRemove={() => array.remove(index)}
          >
            <div className="grid gap-4">
              <FormField id={`procedure-${index}`} label={`Procedure ${index + 1}`}>
                <Input
                  id={`procedure-${index}`}
                  {...register(`content.procedures.${index}.description`)}
                  maxLength={240}
                />
              </FormField>
              <FormSelect
                id={`procedure-status-${index}`}
                label="Procedure status"
                value={values[index]?.status ?? "proposed"}
                onChange={(value) =>
                  setValue(
                    `content.procedures.${index}.status`,
                    value as (typeof values)[number]["status"],
                    { shouldDirty: true },
                  )
                }
                options={["proposed", "planned", "in_progress", "completed", "cancelled"].map(
                  (value) => ({ value, label: value.replaceAll("_", " ") }),
                )}
              />
              <FormField
                id={`procedure-tooth-${index}`}
                label="FDI tooth (optional)"
                hint="Two-digit identifier, for example 16."
              >
                <Input
                  id={`procedure-tooth-${index}`}
                  {...register(`content.procedures.${index}.tooth`)}
                  maxLength={2}
                  inputMode="numeric"
                  className="max-w-32"
                />
              </FormField>
              <FormField id={`procedure-notes-${index}`} label="Procedure notes (optional)">
                <Input
                  id={`procedure-notes-${index}`}
                  {...register(`content.procedures.${index}.notes`)}
                  maxLength={500}
                />
              </FormField>
              {!readOnly && (
                <Button type="button" variant="ghost" onClick={() => array.remove(index)}>
                  Remove procedure {index + 1}
                </Button>
              )}
            </div>
          </ClinicalEntry>
        ))}
      </div>
    </section>
  );
}
