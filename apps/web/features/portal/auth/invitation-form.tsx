"use client";
import { RecordUnavailable } from "@/components/application/record-unavailable";
import { GoogleSignIn, type GoogleConfiguration } from "@/features/auth/google-sign-in";
import { requestWithCsrf } from "@/lib/auth/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
export function InvitationForm({
  busy,
  onSubmit,
  onGoogleSubmit,
}: {
  busy: boolean;
  onGoogleSubmit: (token: string, credential: string) => Promise<void>;
  onSubmit: (values: { token: string; password: string; displayName: string }) => Promise<void>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const captured = useRef<string | null>(null);
  const form = useForm({ defaultValues: { password: "", displayName: "" } });
  const prepareGoogle = useCallback(
    () =>
      requestWithCsrf<GoogleConfiguration>("portal/auth/invitations/google", {
        action: "prepare",
        token,
      }),
    [token],
  );
  useEffect(() => {
    if (captured.current === null)
      captured.current = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    window.history.replaceState(null, "", window.location.pathname); // Capture the external fragment in memory only.
    setToken(captured.current);
  }, []);
  if (token === null) return <p role="status">Loading invitation…</p>;
  if (!token)
    return (
      <RecordUnavailable
        title="An invitation link is needed"
        description="This invitation link is missing. Ask your clinic to issue another invitation, then open the full link from that message."
      />
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
      <GoogleSignIn
        portal
        busy={busy}
        remember={false}
        signup
        prepare={prepareGoogle}
        description="New here? Use Google without creating a Medframe password, then finish authenticator setup. Existing accounts must already have this Google identity connected; otherwise use your password above."
        onSubmit={async (credential) => {
          if (token) await onGoogleSubmit(token, credential);
        }}
      />
    </form>
  );
}
