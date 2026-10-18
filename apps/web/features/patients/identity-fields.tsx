"use client";

import { Controller, useFormContext } from "react-hook-form";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import type { PatientFormValues } from "./form-schema";
import { FormSelect } from "./form-controls";

export function IdentityFields() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<PatientFormValues>();
  return (
    <fieldset className="grid gap-5">
      <legend className="mb-2 text-lg font-semibold">Patient identity</legend>
      <p className="text-sm leading-6 text-muted-foreground">
        Use the patient’s full name. Other details can be added when available.
      </p>
      <FormField id="fullName" label="Full name (required)" error={errors.fullName?.message}>
        <Input
          id="fullName"
          autoComplete="off"
          maxLength={160}
          aria-invalid={!!errors.fullName}
          aria-describedby={errors.fullName ? "fullName-help" : undefined}
          {...register("fullName")}
        />
      </FormField>
      <div className="grid max-w-lg gap-5 sm:grid-cols-2">
        <FormField id="dateOfBirth" label="Date of birth" error={errors.dateOfBirth?.message}>
          <Input
            id="dateOfBirth"
            type="date"
            aria-invalid={!!errors.dateOfBirth}
            aria-describedby={errors.dateOfBirth ? "dateOfBirth-help" : undefined}
            {...register("dateOfBirth")}
          />
        </FormField>
        <Controller
          name="sex"
          control={control}
          render={({ field }) => (
            <FormSelect
              id="sex"
              label="Sex recorded for care"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: "not_recorded", label: "Not recorded" },
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
                { value: "intersex", label: "Intersex" },
              ]}
            />
          )}
        />
      </div>
    </fieldset>
  );
}
