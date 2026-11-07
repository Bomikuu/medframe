"use client";

import { Controller, get, useFormContext } from "react-hook-form";
import { PhoneInput } from "@/components/application/phone-input";
import { callingCodeByCountry, digitsOnly } from "@/lib/contact-format";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/features/patients/form-controls";
import { FormField } from "@/components/form-field";
import type { Fields } from "./schema";

export function Field({
  name,
  label,
  type = "text",
  hint,
  maxLength,
  wide = false,
}: {
  name: string;
  label: string;
  type?: string;
  hint?: string;
  maxLength?: number;
  wide?: boolean;
}) {
  const {
    register,
    setValue,
    control,
    watch,
    formState: { errors },
  } = useFormContext<Fields>();
  const field = register(name, type === "number" ? { valueAsNumber: true } : {});
  const error = get(errors, name)?.message as string | undefined;
  const id = `setup-${name}`;
  const country = String(watch("country") ?? "PH");
  const phPostalCode = name === "postal_code" && country === "PH";
  const accessibility = {
    "aria-invalid": Boolean(error),
    "aria-describedby": error || hint ? `${id}-help` : undefined,
  };
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <FormField id={id} label={label} hint={hint} error={error}>
        {type === "textarea" ? (
          <Textarea id={id} rows={4} maxLength={maxLength} {...field} {...accessibility} />
        ) : type === "tel" ? (
          <Controller
            name={name}
            control={control}
            render={({ field: phone }) => (
              <PhoneInput
                key={country}
                id={id}
                name={phone.name}
                ref={phone.ref}
                value={String(phone.value ?? "")}
                onValueChange={phone.onChange}
                onBlur={phone.onBlur}
                defaultCallingCode={callingCodeByCountry[country] ?? "63"}
                {...accessibility}
              />
            )}
          />
        ) : (
          <Input
            id={id}
            type={type}
            maxLength={phPostalCode ? 4 : maxLength}
            autoComplete={type === "email" ? "email" : phPostalCode ? "postal-code" : undefined}
            autoCapitalize={type === "email" ? "none" : undefined}
            spellCheck={type === "email" ? false : undefined}
            inputMode={
              phPostalCode || type === "number" ? "numeric" : type === "email" ? "email" : undefined
            }
            min={type === "number" ? 5 : undefined}
            max={type === "number" ? 240 : undefined}
            {...field}
            {...accessibility}
            onChange={(event) => {
              if (phPostalCode) event.target.value = digitsOnly(event.target.value).slice(0, 4);
              void field.onChange(event);
            }}
            onBlur={(event) => {
              if (type === "email")
                setValue(name, event.target.value.trim().toLowerCase(), {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              void field.onBlur(event);
            }}
          />
        )}
      </FormField>
    </div>
  );
}
export function Choice({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<Fields>();
  const error = get(errors, name)?.message as string | undefined;
  return (
    <div>
      <FormSelect
        id={`setup-${name}`}
        label={label}
        value={String(watch(name) ?? "")}
        onChange={(value) => setValue(name, value, { shouldDirty: true, shouldValidate: true })}
        options={options}
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
