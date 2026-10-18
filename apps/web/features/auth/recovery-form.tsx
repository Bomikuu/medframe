"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { FormField } from "@/components/form-field";
import { errorMessage, requestWithCsrf } from "@/lib/auth/client";
import { newPasswordSchema } from "@/lib/auth/schemas";

const emailSchema = z.object({ email: z.email("Enter a valid email address.") });

export function RecoveryRequestForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) });
  async function submit(values: z.infer<typeof emailSchema>) {
    setError("");
    try {
      await requestWithCsrf("auth/recovery/request", values);
      setSent(true);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  return (
    <div className="grid gap-7">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">Reset your password</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We’ll send a secure link to your work email.
        </p>
      </header>
      {sent ? (
        <p role="status" className="rounded-lg border border-border bg-muted p-4 text-sm leading-6">
          If an active account matches, a reset link will be sent. Check your inbox and spam folder.
        </p>
      ) : (
        <form noValidate onSubmit={handleSubmit(submit)} className="grid gap-6">
          <FormField id="email" label="Work email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-help" : undefined}
              {...register("email")}
            />
          </FormField>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <Link href="/login" className="text-sm font-medium text-primary hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}

export function PasswordResetForm() {
  const [token, setToken] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof newPasswordSchema>>({ resolver: zodResolver(newPasswordSchema) });
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    // The URL fragment is an external browser value unavailable during server rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(params.get("token") ?? "");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  async function submit(values: z.infer<typeof newPasswordSchema>) {
    setError("");
    try {
      await requestWithCsrf("auth/recovery/reset", { ...values, token });
      setComplete(true);
      setToken("");
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  return (
    <div className="grid gap-7">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">Choose a new password</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Your authenticator will still be required at sign-in.
        </p>
      </header>
      {complete ? (
        <p role="status" className="text-sm leading-6">
          Password updated. Your previous sessions have been signed out.
        </p>
      ) : token ? (
        <form noValidate onSubmit={handleSubmit(submit)} className="grid gap-6">
          <FormField
            id="password"
            label="New password"
            hint="Use 15 to 128 characters. A long passphrase works well."
            error={errors.password?.message}
          >
            <PasswordInput
              id="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              aria-describedby="password-help"
              {...register("password")}
            />
          </FormField>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      ) : token === null ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted" aria-label="Loading reset form" />
      ) : (
        <p role="alert" className="text-sm leading-6 text-destructive">
          This reset link is missing or expired.{" "}
          <Link href="/auth/recover" className="underline">
            Request a new link.
          </Link>
        </p>
      )}
      <Link href="/login" className="text-sm font-medium text-primary hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
