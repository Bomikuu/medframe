"use client";

import { useCallback, useState } from "react";
import { Info, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { FormField } from "@/components/form-field";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ApiError, errorMessage } from "@/lib/auth/client";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { PageHeading } from "@/features/patients/feedback";
import { SignInModeChoices, modeLabel, signInModes, type SignInMode } from "./policy-modes";

export type SecuritySnapshot = {
  organization: string;
  mode: SignInMode;
  revision: number;
  updated_at: string | null;
  effective_mode: SignInMode;
  platform_strict: boolean;
  sign_in_again?: boolean;
};

export function SecuritySettings({
  data,
  save,
  reload,
}: {
  data: SecuritySnapshot;
  save: (mode: SignInMode, password: string, revision: number) => Promise<SecuritySnapshot>;
  reload: () => void;
}) {
  const [mode, setMode] = useState(data.mode);
  const [dialog, setDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState("");
  const [reauthenticate, setReauthenticate] = useState(false);
  const discard = useCallback(() => setMode(data.mode), [data.mode]);
  useUnsavedChanges("clinic-sign-in-policy", mode !== data.mode, discard);
  const selected = signInModes.find((item) => item.value === mode)!;

  async function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!password) {
      setError("Enter your current password to confirm this change.");
      return;
    }
    setBusy(true);
    setError("");
    setConflict(false);
    try {
      const result = await save(mode, password, data.revision);
      setPassword("");
      setDialog(false);
      setNotice(`${modeLabel(result.mode)} saved for ${result.organization}.`);
      setReauthenticate(result.sign_in_again === true);
    } catch (cause) {
      setError(errorMessage(cause));
      setConflict(cause instanceof ApiError && cause.code === "CONFLICT");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeading title="Security" description="Choose how your team signs in to your clinic." />
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-primary/20 bg-teal-soft p-4 text-sm leading-6 text-teal-ink"
        >
          {notice}
        </p>
      )}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-7">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-soft text-primary">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Staff sign-in</h2>
              <p className="mt-1 text-sm text-muted-foreground">{data.organization}</p>
            </div>
          </div>
          <p className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
            Current mode: {modeLabel(data.mode)}
          </p>
        </header>
        <SignInModeChoices
          value={mode}
          onChange={(value) => {
            setMode(value);
            setNotice("");
          }}
          disabled={busy || reauthenticate}
        />
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{selected.detail}</p>
        <div className="mt-7 flex gap-3 rounded-lg bg-muted/60 p-4 text-sm leading-6">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="font-medium">One account can belong to several clinics</p>
            <p className="mt-1 text-muted-foreground">
              The strongest requirement applies: Strict, then Remember for 30 days, then Password
              only.
            </p>
            <p className="mt-2 text-muted-foreground">
              {data.platform_strict
                ? "Your platform administrator account always uses Strict, even if this clinic chooses another mode."
                : `Your account currently follows ${modeLabel(data.effective_mode)}.`}
            </p>
          </div>
        </div>
        <footer className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <p className="max-w-xl text-xs leading-5 text-muted-foreground">
            Changing mode clears remembered browsers and ends reduced-verification sessions for this
            clinic’s team. Their next sign-in follows the new requirement.
          </p>
          <Button
            disabled={busy || mode === data.mode || reauthenticate}
            onClick={() => {
              setError("");
              setConflict(false);
              setPassword("");
              setDialog(true);
            }}
          >
            <Save className="size-4" />
            Save sign-in mode
          </Button>
        </footer>
      </section>
      {reauthenticate && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-3 text-sm leading-6">
            Your sign-in settings changed. Sign in again to continue with the new requirement.
          </p>
          <Button asChild>
            <a href="/login">Sign in again</a>
          </Button>
        </div>
      )}
      <section className="grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
        <div>
          <h2 className="font-semibold">Remember a browser, not a session</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Remember for 30 days skips repeat authenticator codes on a verified personal browser.
            Staff still sign in with their password. Stay logged in is a separate choice; the
            30-minute inactivity limit remains.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Other verification stays in place</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Initial account activation, patient verification, pairing codes and new Google account
            linking keep their own checks. Existing authenticator setup and recovery codes are
            preserved.
          </p>
        </div>
      </section>
      <Dialog
        open={dialog}
        onOpenChange={(open) => {
          if (!busy) {
            setDialog(open);
            if (!open) {
              setPassword("");
              setError("");
            }
          }
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogTitle className="pr-8 text-xl leading-7 font-semibold">
            Change clinic sign-in mode?
          </DialogTitle>
          <DialogDescription>
            Set {data.organization} to {modeLabel(mode)}. {selected.description} Enter your own
            current password to confirm.
          </DialogDescription>
          <form noValidate onSubmit={confirm} className="grid gap-5">
            <FormField
              id="security-password"
              label="Your current password"
              error={error || undefined}
            >
              <PasswordInput
                id="security-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                disabled={busy}
                maxLength={128}
                aria-invalid={!!error}
                aria-describedby={error ? "security-password-help" : undefined}
              />
            </FormField>
            {conflict && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialog(false);
                  setPassword("");
                  reload();
                }}
              >
                Load latest settings
              </Button>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setDialog(false);
                  setPassword("");
                }}
              >
                Keep current mode
              </Button>
              <Button type="submit" disabled={busy || conflict} aria-busy={busy}>
                {busy ? "Saving…" : "Change sign-in mode"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
