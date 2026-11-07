"use client";

import { PersonAvatar, type PersonPresentation } from "@/components/application/person-identity";
import { useId } from "react";
import { FormField } from "@/components/form-field";
import {
  Select as ChoiceRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export function FormSelect({
  id,
  label,
  value,
  onChange,
  options,
  error,
  disabled,
  personKind,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; person?: PersonPresentation | false }[];
  personKind?: PersonPresentation["kind"];
  error?: string;
  disabled?: boolean;
}) {
  // Radix reserves an empty value for clearing. Keep domain values unchanged at the boundary.
  const emptyValue = `empty-option-${useId()}`;
  const emptyOption = options.find((option) => option.value === "");
  return (
    <FormField id={id} label={label} error={error}>
      <ChoiceRoot
        value={value === "" && emptyOption ? emptyValue : value}
        onValueChange={(next) => onChange(next === emptyValue ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className="h-11 w-full min-w-0 data-[size=default]:h-11 [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-help` : undefined}
        >
          <SelectValue placeholder={emptyOption?.label ?? "Choose an option"} />
        </SelectTrigger>
        <SelectContent position="popper">
          {options.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value === "" ? emptyValue : item.value}
              textValue={item.label}
              className="min-h-11 px-3"
            >
              {item.person !== false &&
              !!item.value &&
              !["all", "none", "branch"].includes(item.value) &&
              (item.person || personKind) ? (
                <span className="inline-flex min-w-0 items-center gap-2">
                  <PersonAvatar {...(item.person || { kind: personKind!, name: item.label })} />
                  <span className="min-w-0 truncate">{item.label}</span>
                </span>
              ) : (
                item.label
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </ChoiceRoot>
    </FormField>
  );
}
