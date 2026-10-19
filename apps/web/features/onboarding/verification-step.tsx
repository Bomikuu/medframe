"use client";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { onboardingClient, message } from "./client";
import {
  RequestClinicCodeDocument,
  VerifyClinicEmailDocument,
} from "@/lib/graphql/onboarding/generated";
export function VerificationStep({
  email,
  onVerified,
  onAccount,
}: {
  email: string;
  onVerified: (value: unknown) => void;
  onAccount: () => void;
}) {
  const [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [cooldown, setCooldown] = useState(false);
  async function send() {
    setBusy(true);
    setError("");
    try {
      await onboardingClient().request(RequestClinicCodeDocument, {});
      setSent(true);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 60000);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    setBusy(true);
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
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <MailCheck className="mb-8 size-10 text-teal-700" />
      <h1 className="text-3xl font-semibold">Verify your invited email</h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        We’ll send a code to {email}. This protects your clinic setup when you return on another
        device.
      </p>
      {error && (
        <p role="alert" className="mt-5 text-sm text-destructive">
          {error}
        </p>
      )}
      {sent && (
        <div className="mt-8">
          <label htmlFor="email-code" className="mb-3 block text-sm font-medium">
            Verification code
          </label>
          <InputOTP
            id="email-code"
            maxLength={6}
            value={code}
            onChange={setCode}
            pattern="[0-9]*"
            autoComplete="one-time-code"
            pasteTransformer={(value) => value.replace(/\D/g, "")}
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, index) => (
                <InputOTPSlot key={index} index={index} className="size-12 text-lg" />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <Button className="mt-6" disabled={busy || code.length !== 6} onClick={verify}>
            Verify and continue
          </Button>
        </div>
      )}
      <Button
        className="mt-6"
        variant={sent ? "ghost" : "default"}
        disabled={busy || cooldown}
        onClick={send}
      >
        {sent
          ? cooldown
            ? "You can resend in one minute"
            : "Resend code"
          : "Send verification code"}
      </Button>
      <p className="mt-8 text-xs leading-6 text-muted-foreground">
        Codes expire in 10 minutes. Use the original invitation link whenever you need to resume.
      </p>
    </main>
  );
}
