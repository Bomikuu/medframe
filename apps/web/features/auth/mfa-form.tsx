"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CodeValues>({ resolver: zodResolver(codeSchema) });
  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
      {enrollmentUri && <MfaEnrollmentInstructions uri={enrollmentUri} />}
      <FormField
        id="code"
        label={enrollmentUri ? "Authenticator code" : "Authenticator or recovery code"}
        error={errors.code?.message}
        hint={
          enrollmentUri
            ? "Enter the six-digit code from your authenticator app."
            : "Enter your authenticator code or one of your saved recovery codes."
        }
      >
        <Input
          id="code"
          className="max-w-64 font-mono tracking-widest"
          type="text"
          inputMode={enrollmentUri ? "numeric" : "text"}
          autoComplete="one-time-code"
          spellCheck={false}
          aria-invalid={!!errors.code}
          aria-describedby="code-help"
          {...register("code")}
        />
      </FormField>
      <Button type="submit" disabled={busy} aria-busy={busy}>
        {busy ? "Verifying…" : "Verify and continue"}
      </Button>
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
