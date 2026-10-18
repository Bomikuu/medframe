"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
export function InvitationForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (values: { token: string; password: string; displayName: string }) => Promise<void>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const captured = useRef<string | null>(null);
  const form = useForm({ defaultValues: { password: "", displayName: "" } });
  useEffect(() => {
    if (captured.current === null)
      captured.current = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    window.history.replaceState(null, "", window.location.pathname); // Capture the external fragment in memory only.
    setToken(captured.current);
  }, []);
  if (token === null) return <p role="status">Loading invitation…</p>;
  if (!token)
    return (
      <p role="alert">
        This invitation link is missing. Ask your clinic to issue another invitation.
      </p>
    );
  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={form.handleSubmit((values) => onSubmit({ ...values, token }))}
    >
      <p className="text-sm leading-6 text-muted-foreground">
        The clinic has verified the invited relationship. Use your existing Medframe password if you
        already have an account. For a new account, choose a password of 15–128 characters.
      </p>
      <FormField id="invite-name" label="Your display name (new accounts)">
        <Input
          id="invite-name"
          autoComplete="name"
          maxLength={160}
          {...form.register("displayName")}
        />
      </FormField>
      <FormField
        id="invite-password"
        label="Account password"
        error={form.formState.errors.password?.message}
      >
        <PasswordInput
          id="invite-password"
          autoComplete="current-password"
          maxLength={128}
          {...form.register("password", {
            required: "Enter your existing password or choose a new password.",
          })}
        />
      </FormField>
      <Button disabled={busy} aria-busy={busy}>
        Continue with invitation
      </Button>
    </form>
  );
}
