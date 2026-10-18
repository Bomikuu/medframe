"use client";

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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <FormField id={id} label={label} error={error}>
      <ChoiceRoot value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          className="h-11 w-full data-[size=default]:h-11"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-help` : undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {options.map((item) => (
            <SelectItem key={item.value} value={item.value} className="min-h-11 px-3">
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </ChoiceRoot>
    </FormField>
  );
}
