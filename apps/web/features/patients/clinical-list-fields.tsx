"use client";

import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSafety } from "@/features/workspace/safety-provider";
import { FormSelect } from "./form-controls";
import type { ClinicalValues } from "./clinical-schema";

const reviewOptions = [
  { value: "unreviewed", label: "Not reviewed" },
  { value: "none_reported", label: "None reported" },
  { value: "recorded", label: "Recorded below" },
];

export function ClinicalListFields() {
  const {
    control,
    register,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<ClinicalValues>();
  const allergies = useFieldArray({ control, name: "allergies" });
  const medications = useFieldArray({ control, name: "medications" });
  const { confirm } = useSafety();
  async function changeReview(kind: "allergy" | "medication", value: string) {
    const field = kind === "allergy" ? "allergyState" : "medicationState";
    const list = kind === "allergy" ? "allergies" : "medications";
    const entries = getValues(list);
    if (
      value !== "recorded" &&
      entries.length &&
      !(await confirm({
        title: `Remove entered ${list}?`,
        description:
          "Changing the review state will remove these unsaved list entries. Saved revisions stay in the medical history.",
        action: "Change review state",
      }))
    )
      return;
    if (value !== "recorded") setValue(list, [], { shouldDirty: true });
    else if (!entries.length) {
      if (kind === "allergy")
        allergies.append({ substance: "", reaction: "", severity: "unknown" });
      else medications.append({ name: "", dose: "", frequency: "" });
    }
    setValue(field, value as ClinicalValues[typeof field], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }
  return (
    <>
      <fieldset className="grid gap-5 border-t border-border pt-6">
        <legend className="pr-3 text-lg font-semibold">Allergies</legend>
        <div className="max-w-xs">
          <Controller
            name="allergyState"
            control={control}
            render={({ field }) => (
              <FormSelect
                id="allergyState"
                label="Allergy review"
                value={field.value}
                onChange={(value) => {
                  void changeReview("allergy", value);
                }}
                options={reviewOptions}
                error={errors.allergyState?.message}
              />
            )}
          />
        </div>
        {allergies.fields.map((entry, index) => (
          <div key={entry.id} className="grid gap-4 rounded-lg border border-border p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id={`allergen-${index}`}
                label={`Allergen ${index + 1}`}
                error={errors.allergies?.[index]?.substance?.message}
              >
                <Input
                  id={`allergen-${index}`}
                  maxLength={120}
                  aria-invalid={!!errors.allergies?.[index]?.substance}
                  aria-describedby={
                    errors.allergies?.[index]?.substance ? `allergen-${index}-help` : undefined
                  }
                  {...register(`allergies.${index}.substance`)}
                />
              </FormField>
              <Controller
                name={`allergies.${index}.severity`}
                control={control}
                render={({ field }) => (
                  <FormSelect
                    id={`severity-${index}`}
                    label={`Severity ${index + 1}`}
                    value={field.value}
                    onChange={field.onChange}
                    options={["unknown", "mild", "moderate", "severe"].map((value) => ({
                      value,
                      label: value[0].toUpperCase() + value.slice(1),
                    }))}
                  />
                )}
              />
            </div>
            <FormField
              id={`reaction-${index}`}
              label={`Reaction ${index + 1}`}
              error={errors.allergies?.[index]?.reaction?.message}
            >
              <Input
                id={`reaction-${index}`}
                maxLength={240}
                {...register(`allergies.${index}.reaction`)}
              />
            </FormField>
            <Button
              type="button"
              variant="ghost"
              className="justify-self-start text-destructive"
              onClick={() => {
                allergies.remove(index);
                if (allergies.fields.length === 1)
                  setValue("allergyState", "unreviewed", { shouldDirty: true });
              }}
            >
              Remove allergy {index + 1}
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="justify-self-start"
          disabled={allergies.fields.length >= 20}
          onClick={() => {
            setValue("allergyState", "recorded", { shouldDirty: true });
            allergies.append({ substance: "", reaction: "", severity: "unknown" });
          }}
        >
          Add allergy
        </Button>
      </fieldset>
      <fieldset className="grid gap-5 border-t border-border pt-6">
        <legend className="pr-3 text-lg font-semibold">Current medications</legend>
        <div className="max-w-xs">
          <Controller
            name="medicationState"
            control={control}
            render={({ field }) => (
              <FormSelect
                id="medicationState"
                label="Medication review"
                value={field.value}
                onChange={(value) => {
                  void changeReview("medication", value);
                }}
                options={reviewOptions}
                error={errors.medicationState?.message}
              />
            )}
          />
        </div>
        {medications.fields.map((entry, index) => (
          <div key={entry.id} className="grid gap-4 rounded-lg border border-border p-4">
            <FormField
              id={`medication-${index}`}
              label={`Medication ${index + 1}`}
              error={errors.medications?.[index]?.name?.message}
            >
              <Input
                id={`medication-${index}`}
                maxLength={120}
                aria-invalid={!!errors.medications?.[index]?.name}
                aria-describedby={
                  errors.medications?.[index]?.name ? `medication-${index}-help` : undefined
                }
                {...register(`medications.${index}.name`)}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id={`dose-${index}`} label={`Dose ${index + 1}`}>
                <Input
                  id={`dose-${index}`}
                  maxLength={80}
                  {...register(`medications.${index}.dose`)}
                />
              </FormField>
              <FormField id={`frequency-${index}`} label={`Frequency ${index + 1}`}>
                <Input
                  id={`frequency-${index}`}
                  maxLength={80}
                  {...register(`medications.${index}.frequency`)}
                />
              </FormField>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="justify-self-start text-destructive"
              onClick={() => {
                medications.remove(index);
                if (medications.fields.length === 1)
                  setValue("medicationState", "unreviewed", { shouldDirty: true });
              }}
            >
              Remove medication {index + 1}
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="justify-self-start"
          disabled={medications.fields.length >= 20}
          onClick={() => {
            setValue("medicationState", "recorded", { shouldDirty: true });
            medications.append({ name: "", dose: "", frequency: "" });
          }}
        >
          Add medication
        </Button>
      </fieldset>
    </>
  );
}
