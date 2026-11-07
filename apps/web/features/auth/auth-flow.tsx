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
import { BrowserMemory } from "./browser-memory";
type SignInResult = {
  nextStep: "enroll" | "verify" | "authenticated";
  canRememberBrowser?: boolean;
};

type Step = "login" | "enroll" | "verify" | "recovery";

export function AuthFlow({
  portal = false,
  invitation = false,
  onAuthenticated,
}: {
  portal?: boolean;
  invitation?: boolean;
  onAuthenticated?: () => void;
}) {
  const prefix = portal ? "portal/auth" : "auth";
  const router = useRouter();
  const [step, setStep] = useState<Step>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uri, setUri] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [canRememberBrowser, setCanRememberBrowser] = useState(false);
  function enterWorkspace() {
    setCodes([]);
    if (onAuthenticated) {
      onAuthenticated();
      return;
    }
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
      const result = await requestWithCsrf<SignInResult>(`${prefix}/login`, {
        ...values,
        remember: onAuthenticated ? false : values.remember,
        shared_device: !!onAuthenticated,
      });
      if (result.nextStep === "authenticated") {
        enterWorkspace();
        return;
      }
      setCanRememberBrowser(result.canRememberBrowser === true && !portal && !onAuthenticated);
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
  async function verify(values: CodeValues, trustBrowser = false) {
    await run(async () => {
      const result = await requestWithCsrf<{ recoveryCodes: string[] | null }>(
        `${prefix}/mfa/verify`,
        { ...values, trust_browser: canRememberBrowser && trustBrowser },
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
  async function googleLogin(credential: string, remember: boolean) {
    await run(async () => {
      const result = await requestWithCsrf<SignInResult>(`${prefix}/google/login`, {
        credential,
        remember: onAuthenticated ? false : remember,
        shared_device: !!onAuthenticated,
      });
      if (result.nextStep === "authenticated") {
        enterWorkspace();
        return;
      }
      setCanRememberBrowser(result.canRememberBrowser === true && !portal && !onAuthenticated);
      setStep(result.nextStep);
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
    <div className="grid gap-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">{heading}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
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
            onGoogleSubmit={async (token, credential) => {
              await run(async () => {
                const result = await requestWithCsrf<{ nextStep: "enroll" | "verify" }>(
                  "portal/auth/invitations/google",
                  { action: "activate", token, credential },
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
          <LoginForm
            onSubmit={login}
            onGoogleSubmit={googleLogin}
            busy={busy}
            portal={portal}
            sharedDevice={!!onAuthenticated}
          />
        ))}
      {(step === "enroll" || step === "verify") && (
        <MfaVerificationForm
          key={step}
          onSubmit={verify}
          busy={busy}
          enrollmentUri={step === "enroll" ? uri : undefined}
          canRememberBrowser={canRememberBrowser}
        />
      )}
      {step === "login" && !portal && !invitation && !onAuthenticated && <BrowserMemory />}
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
