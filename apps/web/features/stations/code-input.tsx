"use client";

import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export function StationCode({
  value,
  onChange,
  label = "Pairing code",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <InputOTP
      maxLength={8}
      value={value}
      onChange={(next) => onChange(next.toUpperCase())}
      pattern="[a-zA-Z2-9]*"
      inputMode="text"
      autoComplete="off"
      aria-label={label}
      disabled={disabled}
      pasteTransformer={(text) => text.replace(/[\s-]/g, "").toUpperCase()}
    >
      <InputOTPGroup className="gap-1.5">
        {Array.from({ length: 8 }, (_, index) => (
          <InputOTPSlot
            key={index}
            index={index}
            className="size-8 rounded-md border text-base font-semibold first:rounded-md last:rounded-md sm:size-10 sm:text-lg"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}

export function TemporaryCode({ code, expiresAt }: { code: string; expiresAt: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-5">
      <p className="text-xs text-muted-foreground">
        Single-use code · expires{" "}
        {new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
      <p
        className="mt-3 text-3xl font-semibold tracking-[0.12em] text-primary select-all"
        aria-label={`Code ${code}`}
      >
        {code.slice(0, 4)} {code.slice(4)}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Share directly with the receiving device. Keep this code private.
      </p>
    </div>
  );
}
