"use client";

import { RecordUnavailable } from "@/components/application/record-unavailable";
import { KeyRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { FormField } from "@/components/form-field";
import { errorMessage, requestWithCsrf } from "@/lib/auth/client";
import { newPasswordSchema } from "@/lib/auth/schemas";

export { RecoveryRequestForm } from "./recovery-request-form";

export function PasswordResetForm({ portal = false }: { portal?: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const captured = useRef<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof newPasswordSchema>>({ resolver: zodResolver(newPasswordSchema) });
  useEffect(() => {
    if (captured.current === null)
      captured.current = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    // The URL fragment is an external browser value unavailable during server rendering.
    setToken(captured.current);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  async function submit(values: z.infer<typeof newPasswordSchema>) {
    setError("");
    try {
      await requestWithCsrf(portal ? "portal/auth/recovery/reset" : "auth/recovery/reset", {
        ...values,
        token,
      });
      setComplete(true);
      setToken("");
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  return (
    <div className="grid gap-7">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Choose a new password</h1>
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
        <RecordUnavailable
          title="This reset link is unavailable"
          description="The password-reset link is missing or expired. Request a new link and open the latest message from your inbox."
        >
          <Button asChild>
            <Link href={portal ? "/portal/recover" : "/auth/recover"}>
              <KeyRound aria-hidden="true" />
              Request a new link
            </Link>
          </Button>
        </RecordUnavailable>
      )}
      <Link
        href={portal ? "/portal/login" : "/login"}
        className="text-sm font-medium text-primary hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
