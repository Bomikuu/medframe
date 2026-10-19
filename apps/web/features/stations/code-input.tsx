"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  return <CopyableCode key={`${code}:${expiresAt}`} code={code} expiresAt={expiresAt} />;
}

function CopyableCode({ code, expiresAt }: { code: string; expiresAt: string }) {
  const [expired, setExpired] = useState(() => Date.now() >= new Date(expiresAt).getTime());
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "failed">("idle");

  useEffect(() => {
    const timer = window.setTimeout(
      () => setExpired(true),
      Math.max(0, new Date(expiresAt).getTime() - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  async function copy() {
    if (Date.now() >= new Date(expiresAt).getTime()) {
      setExpired(true);
      return;
    }
    setCopyState("copying");
    try {
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section
      aria-label="Temporary access code"
      className="rounded-xl border border-border bg-muted/40 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Single-use code</span>
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Clock3 className="size-3.5" aria-hidden="true" />
          Expires{" "}
          {new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {expired ? (
        <p role="status" className="py-6 text-center text-lg font-semibold">
          Code expired
        </p>
      ) : (
        <p
          className="my-5 grid grid-cols-8 gap-1 font-mono text-lg font-semibold text-primary select-all sm:gap-2 sm:text-2xl"
          aria-label={`Code ${code}`}
        >
          {Array.from(code).map((character, index) => (
            <span
              key={index}
              aria-hidden="true"
              className="flex h-12 min-w-0 items-center justify-center rounded-md border border-border bg-background sm:h-14"
            >
              {character}
            </span>
          ))}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-full bg-background"
        disabled={expired || copyState === "copying"}
        onClick={() => void copy()}
      >
        {copyState === "copied" ? <Check /> : <Copy />}
        {copyState === "copied" ? "Copied" : copyState === "copying" ? "Copying…" : "Copy code"}
      </Button>
      <p className="sr-only" role="status">
        {!expired && copyState === "copied" ? "Code copied to clipboard." : ""}
      </p>
      {!expired && copyState === "failed" && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          Couldn’t copy the code. Select it and copy manually.
        </p>
      )}
      <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
        {expired
          ? "Generate a new code to continue."
          : "Keep this code private. It works on one receiving device."}
      </p>
    </section>
  );
}
