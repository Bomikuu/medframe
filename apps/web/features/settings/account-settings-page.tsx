"use client";

import { useEffect, useState } from "react";
import { Save, ShieldCheck, UserRoundPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { PageHeading } from "@/features/patients/feedback";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { SecurityPage } from "@/features/security/security-page";
import { BrowserMemory } from "@/features/auth/browser-memory";
import { ApiError, errorMessage, requestWithCsrf } from "@/lib/auth/client";
import { AccountScopeSummary } from "./account-scope-summary";
import { AccountPhoto } from "./account-photo";

type Profile = { display_name: string; email: string };

export function AccountSettingsPage() {
  const { overview, can } = useWorkspace();
  return (
    <div className="grid min-w-0 gap-8">
      <PageHeading
        title="Account & security"
        description="Your profile and the settings that protect your workspace."
      />
      <AccountScopeSummary />
      <AccountProfile key={overview.currentUser.id} />
      {can("organization.manage") ? (
        <SecurityPage />
      ) : (
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldCheck aria-hidden className="size-5 text-teal-ink" /> Sign-in security
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your clinic administrator manages the sign-in policy. Your current password and
            verification settings remain in place.
          </p>
          <BrowserMemory />
        </section>
      )}
    </div>
  );
}

function AccountProfile() {
  const { overview } = useWorkspace();
  const capture = useRequestScope();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState(overview.currentUser.displayName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const [generation, setGeneration] = useState(0);
  const dirty = profile !== null && name !== profile.display_name;
  useUnsavedChanges("account-display-name", dirty, () => setName(profile?.display_name ?? ""));
  useEffect(() => {
    const controller = new AbortController();
    requestWithCsrf<Profile>("auth/profile", {}, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setProfile(data);
          setName(data.display_name);
          setError("");
          setConflict(false);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      });
    return () => controller.abort();
  }, [generation]);

  return (
    <section className="grid min-w-0 gap-6 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <UserRoundPen aria-hidden className="size-5 text-teal-ink" /> Your profile
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the name and photo your team will recognize.
        </p>
      </div>
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-2">
        <AccountPhoto />
        <form
          noValidate
          className="grid min-w-0 gap-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || !profile) return;
            if (!name.trim() || name.trim().length > 160) {
              setError("Enter a display name between 1 and 160 characters.");
              return;
            }
            const current = capture();
            setBusy(true);
            setError("");
            setNotice("");
            try {
              const result = await requestWithCsrf<Profile>("auth/profile", {
                action: "update",
                display_name: name.trim(),
                expected_name: profile.display_name,
              });
              if (current()) {
                setProfile(result);
                setName(result.display_name);
                window.dispatchEvent(new Event("medframe:account-updated"));
                setNotice("Your display name is saved.");
              }
            } catch (cause) {
              if (current()) {
                setError(errorMessage(cause));
                setConflict(cause instanceof ApiError && cause.code === "CONFLICT");
              }
            } finally {
              if (current()) setBusy(false);
            }
          }}
        >
          <FormField
            id="account-name"
            label="Display name"
            hint="Shown to your team across Medframe."
          >
            <Input
              id="account-name"
              autoComplete="name"
              maxLength={160}
              value={name}
              disabled={!profile || busy}
              onChange={(event) => {
                setName(event.target.value);
                setNotice("");
              }}
              className="max-w-lg"
            />
          </FormField>
          <FormField
            id="account-email"
            label="Sign-in email"
            hint="Your verified sign-in address. Contact your administrator if it needs to change."
          >
            <Input
              id="account-email"
              type="email"
              autoComplete="email"
              value={profile?.email ?? ""}
              readOnly
              className="max-w-lg bg-muted/40"
            />
          </FormField>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm text-teal-ink">
              {notice}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button disabled={!profile || busy || !dirty || conflict}>
              <Save aria-hidden className="size-4" />
              {busy ? "Saving…" : "Save account"}
            </Button>
            {dirty && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setName(profile?.display_name ?? "");
                  setNotice("");
                }}
              >
                Cancel
              </Button>
            )}
            {((!profile && error) || conflict) && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setGeneration((value) => value + 1)}
              >
                Reload account
              </Button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
