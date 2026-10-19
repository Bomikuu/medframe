"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { FormField } from "@/components/form-field";
import { codeSchema, type CodeValues } from "@/lib/auth/schemas";

export function MfaVerificationForm({
  busy,
  onSubmit,
  enrollmentUri,
}: {
  busy: boolean;
  onSubmit: (values: CodeValues) => Promise<void>;
  enrollmentUri?: string;
}) {
  const [recovery, setRecovery] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { code: "" } });
  const submit = handleSubmit(async (values) => {
    const valid = recovery ? /^[a-f0-9]{16}$/i.test(values.code) : /^[0-9]{6}$/.test(values.code);
    if (!valid) {
      setError("code", {
        message: recovery ? "Enter your 16-character recovery code." : "Enter all six digits.",
      });
      return;
    }
    await onSubmit({ code: values.code.toLowerCase() });
  });
  return (
    <form noValidate onSubmit={submit} className="grid gap-6">
      {enrollmentUri && <MfaEnrollmentInstructions uri={enrollmentUri} />}
      <FormField
        id="code"
        label={recovery ? "Recovery code" : "Authenticator code"}
        error={errors.code?.message}
        hint={
          recovery
            ? "Use one of your saved recovery codes. Each code works once."
            : "Enter the six-digit code from your authenticator app. You can paste the full code."
        }
      >
        {recovery ? (
          <Input
            id="code"
            className="max-w-64 font-mono tracking-widest"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            maxLength={16}
            disabled={busy}
            spellCheck={false}
            aria-invalid={!!errors.code}
            aria-describedby="code-help"
            {...register("code")}
          />
        ) : (
          <Controller
            name="code"
            control={control}
            render={({ field }) => (
              <InputOTP
                id="code"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                pasteTransformer={(value) => value.replace(/\D/g, "")}
                autoComplete="one-time-code"
                inputMode="numeric"
                autoFocus
                disabled={busy}
                aria-invalid={!!errors.code}
                aria-describedby="code-help"
                containerClassName="w-full"
              >
                <InputOTPGroup className="grid w-full grid-cols-6 gap-2">
                  {Array.from({ length: 6 }, (_, index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      aria-invalid={!!errors.code}
                      className="h-12 w-full rounded-md border-l text-lg first:rounded-md last:rounded-md"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            )}
          />
        )}
      </FormField>
      <Button type="submit" disabled={busy} aria-busy={busy}>
        {busy ? "Verifying…" : "Verify and continue"}
      </Button>
      {!enrollmentUri && (
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setRecovery(!recovery);
            reset({ code: "" });
          }}
        >
          {recovery ? "Use authenticator instead" : "Use a recovery code"}
        </Button>
      )}
    </form>
  );
}

function MfaEnrollmentInstructions({ uri }: { uri: string }) {
  return (
    <div className="grid gap-4">
      <div className="w-fit rounded-xl border border-border bg-white p-4">
        <QRCodeSVG value={uri} size={156} title="Scan with your authenticator app" />
      </div>
      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">
          Can’t scan the code?
        </summary>
        <p className="mt-3 leading-6">
          Enter this setup key in your authenticator. Keep it private.
        </p>
        <code className="mt-2 block rounded-lg bg-muted p-3 text-xs break-all select-all">
          {new URL(uri).searchParams.get("secret")}
        </code>
      </details>
    </div>
  );
}
