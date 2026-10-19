"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
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
    <div className="rounded-xl border border-border bg-muted/40 p-5">
      <p className="text-xs text-muted-foreground">
        Single-use code · expires{" "}
        {new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p
          className="text-3xl font-semibold tracking-[0.12em] text-primary select-all"
          aria-label={expired ? "Code expired" : `Code ${code}`}
        >
          {expired ? "Code expired" : `${code.slice(0, 4)} ${code.slice(4)}`}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={expired || copyState === "copying"}
          onClick={() => void copy()}
        >
          {copyState === "copied" ? <Check /> : <Copy />}
          {copyState === "copied" ? "Copied" : copyState === "copying" ? "Copying…" : "Copy code"}
        </Button>
      </div>
      <p className="sr-only" role="status">
        {!expired && copyState === "copied" ? "Code copied to clipboard." : ""}
      </p>
      {!expired && copyState === "failed" && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          Couldn’t copy the code. Select it and copy manually.
        </p>
      )}
      <p className="mt-3 text-sm text-muted-foreground">
        {expired
          ? "Generate a new code to continue."
          : "Share directly with the receiving device. Keep this code private."}
      </p>
    </div>
  );
}
