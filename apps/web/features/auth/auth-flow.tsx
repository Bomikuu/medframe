"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, errorMessage, requestWithCsrf } from "@/lib/auth/client";
import type { CodeValues, LoginValues } from "@/lib/auth/schemas";
import { InvitationForm } from "@/features/portal/auth/invitation-form";
import { LoginForm } from "./login-form";
import { MfaVerificationForm } from "./mfa-form";
import { RecoveryCodes } from "./recovery-codes";
import { Button } from "@/components/ui/button";

type Step = "login" | "enroll" | "verify" | "recovery";

export function AuthFlow({
  portal = false,
  invitation = false,
}: {
  portal?: boolean;
  invitation?: boolean;
}) {
  const prefix = portal ? "portal/auth" : "auth";
  const router = useRouter();
  const [step, setStep] = useState<Step>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uri, setUri] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  function enterWorkspace() {
    setCodes([]);
    router.replace(portal ? "/portal" : "/clinic");
    router.refresh();
  }
  async function run(action: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (failure) {
      setError(errorMessage(failure));
      if (failure instanceof ApiError && failure.code === "SESSION_EXPIRED") setStep("login");
    } finally {
      setBusy(false);
    }
  }
  async function login(values: LoginValues) {
    await run(async () => {
      const result = await requestWithCsrf<{ nextStep: "enroll" | "verify" }>(
        `${prefix}/login`,
        values,
      );
      if (result.nextStep === "enroll") {
        const enrollment = await requestWithCsrf<{ otpauthUri: string }>(
          `${prefix}/mfa/enroll`,
          {},
        );
        setUri(enrollment.otpauthUri);
      }
      setStep(result.nextStep);
    });
  }
  async function verify(values: CodeValues) {
    await run(async () => {
      const result = await requestWithCsrf<{ recoveryCodes: string[] | null }>(
        `${prefix}/mfa/verify`,
        values,
      );
      setUri("");
      if (result.recoveryCodes) {
        setCodes(result.recoveryCodes);
        setStep("recovery");
      } else {
        enterWorkspace();
      }
    });
  }
  const heading = {
    login: invitation ? "Accept your invitation" : portal ? "Patient sign in" : "Welcome back",
    enroll: "Protect your account",
    verify: "Verify it’s you",
    recovery: "Save your recovery codes",
  }[step];
  const description = {
    login: portal
      ? "Access records your clinic has shared with you."
      : "Sign in to your clinical workspace.",
    enroll: "Scan this code with your authenticator app, then enter its six-digit code.",
    verify: "Use your authenticator to finish signing in.",
    recovery: "Your authenticator is connected. Keep a backup way to sign in.",
  }[step];
  return (
    <div className="grid gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive"
        >
          {error}
        </p>
      )}
      {step === "login" &&
        (invitation ? (
          <InvitationForm
            busy={busy}
            onSubmit={async (values) => {
              await run(async () => {
                const result = await requestWithCsrf<{ nextStep: "enroll" | "verify" }>(
                  "portal/auth/invitations/prepare",
                  values,
                );
                if (result.nextStep === "enroll") {
                  const enrollment = await requestWithCsrf<{ otpauthUri: string }>(
                    "portal/auth/mfa/enroll",
                    {},
                  );
                  setUri(enrollment.otpauthUri);
                }
                setStep(result.nextStep);
              });
            }}
          />
        ) : (
          <LoginForm onSubmit={login} busy={busy} portal={portal} />
        ))}
      {(step === "enroll" || step === "verify") && (
        <MfaVerificationForm
          key={step}
          onSubmit={verify}
          busy={busy}
          enrollmentUri={step === "enroll" ? uri : undefined}
        />
      )}
      {step === "recovery" && <RecoveryCodes codes={codes} onContinue={enterWorkspace} />}
      {(step === "enroll" || step === "verify") && (
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setStep("login");
            setUri("");
            setError("");
          }}
        >
          Back to sign in
        </Button>
      )}
    </div>
  );
}
