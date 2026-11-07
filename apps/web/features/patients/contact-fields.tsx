"use client";

import { Controller, useFormContext } from "react-hook-form";
import { PhoneInput } from "@/components/application/phone-input";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PatientFormValues } from "./form-schema";

function ContactField({
  name,
  label,
  type = "text",
  maxLength = 160,
}: {
  name: keyof PatientFormValues;
  label: string;
  type?: "text" | "tel" | "email";
  maxLength?: number;
}) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<PatientFormValues>();
  return (
    <FormField id={name} label={label} error={errors[name]?.message}>
      {type === "tel" ? (
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <PhoneInput
              id={name}
              name={field.name}
              ref={field.ref}
              value={String(field.value)}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={!!errors[name]}
              aria-describedby={errors[name] ? `${name}-help` : undefined}
            />
          )}
        />
      ) : (
        <Input
          id={name}
          type={type}
          autoComplete="off"
          maxLength={maxLength}
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? `${name}-help` : undefined}
          {...register(name)}
        />
      )}
    </FormField>
  );
}

export function ContactFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<PatientFormValues>();
  return (
    <div className="grid gap-9">
      <fieldset className="grid gap-5 border-t border-border pt-7">
        <legend className="pr-3 text-lg font-semibold">Contact information</legend>
        <div className="grid gap-5 @[440px]:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <ContactField name="email" label="Email address" type="email" maxLength={254} />
          <ContactField name="phone" label="Phone number" type="tel" maxLength={40} />
        </div>
        <FormField id="address" label="Address" error={errors.address?.message}>
          <Textarea
            className="resize-y"
            id="address"
            maxLength={500}
            aria-invalid={!!errors.address}
            aria-describedby={errors.address ? "address-help" : undefined}
            {...register("address")}
          />
        </FormField>
      </fieldset>
      <fieldset className="grid gap-5 border-t border-border pt-7">
        <legend className="pr-3 text-lg font-semibold">Emergency contact</legend>
        <p className="text-sm text-muted-foreground">Optional contact to use in an emergency.</p>
        <ContactField name="emergencyContactName" label="Contact full name" />
        <div className="grid gap-5 @[440px]:grid-cols-2">
          <ContactField name="emergencyContactRelationship" label="Relationship to patient" />
          <ContactField
            name="emergencyContactPhone"
            label="Emergency contact phone"
            type="tel"
            maxLength={40}
          />
        </div>
      </fieldset>
      <fieldset className="grid gap-5 border-t border-border pt-7">
        <legend className="pr-3 text-lg font-semibold">Guardian contact</legend>
        <p className="text-sm leading-6 text-muted-foreground">
          Add when applicable. A contact entry does not grant access to medical records.
        </p>
        <ContactField name="guardianName" label="Guardian full name" />
        <div className="grid gap-5 @[440px]:grid-cols-2">
          <ContactField name="guardianRelationship" label="Guardian relationship" />
          <ContactField name="guardianPhone" label="Guardian phone" type="tel" maxLength={40} />
        </div>
      </fieldset>
    </div>
  );
}
