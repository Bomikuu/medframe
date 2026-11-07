"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  suggestions: readonly string[];
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  onBlur?: () => void;
  inputRef?: (element: HTMLInputElement | HTMLTextAreaElement | null) => void;
};

export function ReasonField({
  id,
  label,
  value,
  onValueChange,
  suggestions,
  hint,
  error,
  disabled,
  required = false,
  maxLength = 240,
  onBlur,
  inputRef,
}: Props) {
  const [other, setOther] = useState(false);
  const [custom, setCustom] = useState(suggestions.includes(value) ? "" : value);
  const customSelected = other || (!!value && !suggestions.includes(value));
  const description = error || hint;
  return (
    <fieldset
      id={id}
      disabled={disabled}
      className="grid min-w-0 gap-3"
      aria-describedby={description ? `${id}-help` : undefined}
      aria-invalid={!!error}
    >
      <legend className="mb-3 text-sm font-medium">
        {label}
        {required && (
          <span className="ml-1 text-muted-foreground" aria-hidden="true">
            *
          </span>
        )}
      </legend>
      <div className="flex flex-wrap gap-2">
        {[...suggestions, "Other"].map((option, index) => {
          const isOther = index === suggestions.length;
          const checked = isOther ? customSelected : !customSelected && value === option;
          return (
            <label key={option} className="relative cursor-pointer">
              <input
                ref={!customSelected && index === 0 ? inputRef : undefined}
                className="peer sr-only"
                type="radio"
                name={`${id}-choice`}
                value={option}
                checked={checked}
                required={required}
                onBlur={onBlur}
                onChange={() => {
                  if (isOther) {
                    setOther(true);
                    onValueChange(!suggestions.includes(value) ? value : custom);
                  } else {
                    if (value && !suggestions.includes(value)) setCustom(value);
                    setOther(false);
                    onValueChange(option);
                  }
                }}
              />
              <span className="flex min-h-10 items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-sm transition-colors peer-checked:border-primary peer-checked:bg-teal-soft peer-checked:font-medium peer-checked:text-teal-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 hover:bg-muted">
                {checked && <Check aria-hidden className="size-3.5 shrink-0" />}
                {option}
              </span>
            </label>
          );
        })}
      </div>
      {customSelected && (
        <div className="grid gap-2">
          <label htmlFor={`${id}-custom`} className="text-xs font-medium text-muted-foreground">
            Your reason
          </label>
          <Textarea
            ref={inputRef}
            id={`${id}-custom`}
            rows={2}
            value={value}
            required={required}
            maxLength={maxLength}
            placeholder="Enter your reason…"
            aria-invalid={!!error}
            aria-describedby={description ? `${id}-help` : undefined}
            onBlur={onBlur}
            onChange={(event) => {
              setCustom(event.target.value);
              onValueChange(event.target.value);
            }}
          />
        </div>
      )}
      {description && (
        <p
          id={`${id}-help`}
          role={error ? "alert" : undefined}
          className={error ? "text-sm text-destructive" : "text-xs leading-5 text-muted-foreground"}
        >
          {description}
        </p>
      )}
      {!required && value && (
        <button
          type="button"
          className="min-h-8 w-fit text-xs text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setOther(false);
            setCustom("");
            onValueChange("");
          }}
        >
          Clear selection
        </button>
      )}
    </fieldset>
  );
}
