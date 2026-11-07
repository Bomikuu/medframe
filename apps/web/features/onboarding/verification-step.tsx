"use client";

import { useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, Mail, RefreshCw, ShieldCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { OnboardingNotice } from "./onboarding-notice";
import { onboardingClient, message } from "./client";
import {
  RequestClinicCodeDocument,
  VerifyClinicEmailDocument,
} from "@/lib/graphql/onboarding/generated";

export function VerificationStep({
  email,
  onVerified,
  onAccount,
  localInboxUrl,
}: {
  email: string;
  onVerified: (value: unknown) => void;
  onAccount: () => void;
  localInboxUrl?: string;
}) {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!remaining) return;
    const timer = window.setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);
  async function send() {
    if (busy || remaining) return;
    setBusy("send");
    setError("");
    try {
      await onboardingClient().request(RequestClinicCodeDocument, {});
      setSent(true);
      setCode("");
      setRemaining(60);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(null);
    }
  }
  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Enter all six digits from the most recent email.");
      return;
    }
    setBusy("verify");
    setError("");
    try {
      onVerified(
        (await onboardingClient().request(VerifyClinicEmailDocument, { code }))
          .verifyOnboardingEmail,
      );
    } catch (e) {
      const { errorCode } = await import("./client");
      if (errorCode(e) === "ACCOUNT_REQUIRED") onAccount();
      else setError(message(e));
    } finally {
      setBusy(null);
    }
  }
  return (
    <main
      id="main"
      className="onboarding-backdrop flex min-h-[calc(100svh-5rem)] items-center justify-center px-5 py-10"
    >
      <section className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-[var(--panel-shadow)] sm:p-9">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-teal-soft text-teal-ink">
          <ShieldCheck className="size-7" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-semibold">A quick check. Then you’re in.</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {sent ? "A six-digit code was requested for" : "Request a six-digit code for"}{" "}
          <strong className="break-all text-foreground">{email}</strong>. Use it to verify access to
          this clinic invitation.
        </p>
        <div className="mt-6 space-y-5">
          {sent && (
            <OnboardingNotice tone="success">
              Email queued for delivery.{" "}
              {localInboxUrl
                ? "Open the development inbox below."
                : "Allow time for delivery, then check your inbox and spam folder."}{" "}
              It expires in 10 minutes; only the latest code works.
            </OnboardingNotice>
          )}
          {error && <OnboardingNotice tone="error">{error}</OnboardingNotice>}
          {sent && (
            <form noValidate onSubmit={verify} className="space-y-5">
              <div>
                <label htmlFor="email-code" className="mb-3 block text-sm font-medium">
                  Verification code
                </label>
                <InputOTP
                  id="email-code"
                  maxLength={6}
                  value={code}
                  onChange={(value) => {
                    setCode(value);
                    setError("");
                  }}
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  disabled={busy !== null}
                  aria-invalid={Boolean(error)}
                  aria-describedby="verification-hint"
                  pasteTransformer={(value) => value.replace(/\D/g, "")}
                >
                  <InputOTPGroup className="w-full justify-between gap-1 sm:gap-2">
                    {Array.from({ length: 6 }, (_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-12 w-9 rounded-lg border first:rounded-lg last:rounded-lg sm:h-14 sm:w-12"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <p id="verification-hint" className="mt-3 text-xs leading-5 text-muted-foreground">
                  Paste the whole code, or enter one digit in each box.
                </p>
              </div>
              <Button className="w-full" disabled={busy !== null} type="submit">
                {busy === "verify" ? (
                  <LoaderCircle
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowRight aria-hidden="true" />
                )}
                {busy === "verify" ? "Verifying your code…" : "Verify and continue"}
              </Button>
            </form>
          )}
          <Button
            className="w-full"
            variant={sent ? "outline" : "default"}
            disabled={busy !== null || remaining > 0}
            onClick={() => void send()}
          >
            {busy === "send" ? (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : sent ? (
              <RefreshCw aria-hidden="true" />
            ) : (
              <Mail aria-hidden="true" />
            )}
            {busy === "send"
              ? "Sending your code…"
              : remaining
                ? `Resend in ${remaining}s`
                : sent
                  ? "Send a new code"
                  : "Send verification code"}
          </Button>
          {localInboxUrl && (
            <OnboardingNotice>
              Running locally? Messages arrive in the{" "}
              <a
                href={localInboxUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
              >
                development inbox
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
              , rather than your real email inbox.
            </OnboardingNotice>
          )}
          <p className="border-t pt-5 text-xs leading-6 text-muted-foreground">
            Wrong address? Ask your platform administrator for a corrected invitation. Return with
            your original link to resume saved setup.
          </p>
        </div>
      </section>
    </main>
  );
}
