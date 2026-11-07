"use client";

import { useRef, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { digitsOnly, formatNationalPhone, phoneError, splitPhone } from "@/lib/contact-format";

type PhoneInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "defaultValue" | "onChange" | "type" | "maxLength" | "minLength"
> & {
  value: string;
  onValueChange: (value: string) => void;
  defaultCallingCode?: string;
  mobileOnly?: boolean;
};

export function PhoneInput({
  value,
  onValueChange,
  defaultCallingCode = "63",
  mobileOnly = false,
  id,
  className,
  onBlur,
  disabled,
  readOnly,
  ref,
  ...props
}: PhoneInputProps) {
  const [chosenCode, setChosenCode] = useState(defaultCallingCode);
  const inputRef = useRef<HTMLInputElement>(null);
  const { code, number } = splitPhone(value, chosenCode);
  const error = phoneError(value, mobileOnly);
  const maxDigits = code === "63" || code === "1" ? 10 : 15 - code.length;

  function updateNumber(raw: string, caret: number | null) {
    const pastedInternational = /^\s*(\+|00)/.test(raw);
    const parsed = pastedInternational
      ? splitPhone(raw.trim().replace(/^00/, "+"), code || chosenCode)
      : splitPhone(digitsOnly(raw), code || chosenCode);
    const nextCode = parsed.code;
    const nextNumber = parsed.number.slice(
      0,
      nextCode === "63" || nextCode === "1" ? 10 : 15 - nextCode.length,
    );
    setChosenCode(nextCode);
    onValueChange(nextNumber ? `+${nextCode}${nextNumber}` : "");
    if (!pastedInternational && caret !== null) {
      const digitsBefore = digitsOnly(raw.slice(0, caret)).length;
      const formatted = formatNationalPhone(nextNumber, nextCode);
      let position = 0;
      let count = 0;
      while (position < formatted.length && count < digitsBefore) {
        if (/\d/.test(formatted[position])) count++;
        position++;
      }
      requestAnimationFrame(() => inputRef.current?.setSelectionRange(position, position));
    }
  }

  return (
    <div className="flex min-w-0 gap-2">
      <div className="relative w-22 shrink-0">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
        >
          +
        </span>
        <Input
          id={id ? `${id}-prefix` : undefined}
          aria-label="Country calling code"
          type="text"
          inputMode="numeric"
          autoComplete="tel-country-code"
          value={code}
          maxLength={3}
          disabled={disabled || mobileOnly}
          readOnly={readOnly}
          className="pl-7 tabular-nums"
          placeholder="63"
          onChange={(event) => {
            const nextCode = digitsOnly(event.target.value).replace(/^0+/, "").slice(0, 3);
            setChosenCode(nextCode);
            onValueChange(number ? `+${nextCode}${number.slice(0, 15 - nextCode.length)}` : "");
          }}
        />
      </div>
      <Input
        {...props}
        ref={(element) => {
          inputRef.current = element;
          if (typeof ref === "function") ref(element);
          else if (ref) ref.current = element;
        }}
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete={props.autoComplete ?? "tel-national"}
        disabled={disabled}
        readOnly={readOnly}
        value={formatNationalPhone(number, code)}
        placeholder={props.placeholder ?? (code === "63" ? "917 123 4567" : "Phone number")}
        className={className}
        maxLength={24}
        onChange={(event) => updateNumber(event.target.value, event.target.selectionStart)}
        onBlur={onBlur}
        onInvalid={(event) =>
          event.currentTarget.setCustomValidity(error ?? "Enter a phone number.")
        }
        onInput={(event) => event.currentTarget.setCustomValidity("")}
        pattern={
          code === "63"
            ? mobileOnly
              ? "9[0-9 ]{11}"
              : "[0-9 ]{11,12}"
            : `[0-9 ]{${Math.max(1, 7 - code.length)},${maxDigits + 2}}`
        }
        title={error ?? "Enter digits only; the country code is entered separately."}
      />
    </div>
  );
}
