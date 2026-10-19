"use client";
import { useFormContext } from "react-hook-form";
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
    getValues,
    formState: { errors },
  } = useFormContext<Fields>();
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <FormField
        id={`setup-${name}`}
        label={label}
        hint={hint}
        error={errors[name]?.message as string | undefined}
      >
        {type === "textarea" ? (
          <Textarea id={`setup-${name}`} rows={4} maxLength={maxLength} {...register(name)} />
        ) : (
          <Input
            id={`setup-${name}`}
            type={type}
            maxLength={maxLength}
            {...register(name, type === "number" ? { valueAsNumber: true } : {})}
            onBlur={(event) => {
              if (type === "tel") {
                const raw = event.target.value.replace(/[^0-9+]/g, "");
                const prefix = (
                  { PH: "63", US: "1", CA: "1", GB: "44", AU: "61", SG: "65", IN: "91" } as Record<
                    string,
                    string
                  >
                )[String(getValues("country"))];
                setValue(
                  name,
                  raw.startsWith("+") || !prefix ? raw : `+${prefix}${raw.replace(/^0/, "")}`,
                  { shouldDirty: true },
                );
              }
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
  const { watch, setValue } = useFormContext<Fields>();
  return (
    <FormSelect
      id={`setup-${name}`}
      label={label}
      value={String(watch(name) ?? "")}
      onChange={(value) => setValue(name, value, { shouldDirty: true })}
      options={options}
    />
  );
}
