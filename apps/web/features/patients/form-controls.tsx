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
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  disabled?: boolean;
}) {
  return (
    <FormField id={id} label={label} error={error}>
      <ChoiceRoot value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          className="h-11 w-full min-w-0 data-[size=default]:h-11 [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate"
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
