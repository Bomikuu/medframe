"use client";

import { Brand } from "@/components/brand";
import { PhoneInput } from "@/components/application/phone-input";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  Mail,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { FormField } from "@/components/form-field";
import { LoadingInformation } from "@/components/application/loading-information";
import { RecoveryState } from "@/components/application/recovery-state";
import { useStepFocus } from "@/components/application/use-step-focus";
import { errorMessage } from "@/lib/auth/client";
import { OnboardingNotice } from "@/features/onboarding/onboarding-notice";
import { cn } from "@/lib/utils";
import { GoogleSignIn, type GoogleConfiguration } from "@/features/auth/google-sign-in";
import { RegistrationDetails } from "./registration-details";
import { RegistrationStatus } from "./registration-status";
import {
  applicationSchema,
  registrationBootSchema,
  registrationRequest,
  type RegistrationBoot,
  type PatientDetails,
} from "./registration-client";

const stages = [
  { title: "Verify contact", icon: Mail },
  { title: "Patient details", icon: UserRound },
  { title: "Clinic review", icon: ShieldCheck },
];
export function PatientRegistrationFlow({ token }: { token: string }) {
  const [boot, setBoot] = useState<RegistrationBoot | null>(null);
  const [stage, setStage] = useState(0);
  useStepFocus(stage, "registration-stage-title");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<"email" | "mobile">("email");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deliveryNotice, setDeliveryNotice] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const next = registrationBootSchema.parse(await registrationRequest(token, "bootstrap"));
      setBoot(next);
      setEmail(next.email);
      setPhone(next.phone);
      setChannel(next.channel === "mobile" ? "mobile" : "email");
      setStage(next.application ? 2 : next.contact_verified ? 1 : 0);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }, [token]);
  const prepareGoogle = useCallback(
    async () => (await registrationRequest(token, "google_prepare")) as GoogleConfiguration,
    [token],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    if (channel === "email" && !z.string().email().safeParse(email.trim()).success) {
      setError("Enter a valid email address.");
      return;
    }
    if (channel === "mobile" && !/^\+639[0-9]{9}$/.test(phone.replace(/[\s()-]/g, ""))) {
      setError("Enter a Philippine mobile number such as +639171234567.");
      return;
    }
    await run(async () => {
      await registrationRequest(token, "send_code", {
        channel,
        phone,
        email: email.trim().toLowerCase(),
      });
      setSent(true);
      setDeliveryNotice("");
      setCode("");
      setCooldown(60);
    });
  }
  async function submit(details: PatientDetails) {
    await run(async () => {
      const result = z.object({ application: applicationSchema }).parse(
        await registrationRequest(token, "submit", {
          details: { ...details, date_of_birth: details.date_of_birth || null },
        }),
      );
      setBoot((current) => (current ? { ...current, application: result.application } : current));
      setStage(2);
    });
  }
  return (
    <div className="onboarding-backdrop min-h-svh">
      <header className="border-b bg-card px-5 py-4 sm:px-8">
        <Link href="/portal/login" className="inline-flex items-center gap-2 text-xl font-semibold">
          <Brand />
        </Link>
      </header>
      <main id="main" className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {!boot ? (
          error ? (
            <RecoveryState
              title="Registration is unavailable"
              description={error}
              icon={ShieldCheck}
            >
              <Button onClick={() => void load()}>
                <RefreshCw aria-hidden="true" />
                Try again
              </Button>
              <Button variant="outline" asChild>
                <Link href="/portal/login">Patient sign in</Link>
              </Button>
            </RecoveryState>
          ) : (
            <LoadingInformation
              title="Opening patient registration"
              detail="Checking the clinic link and your registration progress."
            />
          )
        ) : (
          <>
            <div className="mb-7 text-center">
              <p className="text-sm font-medium text-teal-800 dark:text-teal-300">
                {boot.clinic} · {boot.branch}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Register as a patient</h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                Verify your contact or sign up with Google, share your details, and let your clinic
                review your registration.
              </p>
            </div>
            <ol aria-label="Registration progress" className="mb-7 grid grid-cols-3 gap-2">
              {stages.map(({ title, icon: Icon }, index) => (
                <li
                  key={title}
                  aria-current={stage === index ? "step" : undefined}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full border",
                      index <= stage
                        ? "border-teal-200 bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200"
                        : "bg-card text-muted-foreground",
                    )}
                  >
                    {index < stage ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      <Icon className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-xs leading-5",
                      stage === index ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {title}
                  </span>
                </li>
              ))}
            </ol>
            <section className="rounded-2xl border bg-card p-5 sm:p-8">
              {error && (
                <div className="mb-5">
                  <OnboardingNotice tone="error">{error}</OnboardingNotice>
                </div>
              )}
              {stage === 0 && (
                <>
                  <h2
                    id="registration-stage-title"
                    tabIndex={-1}
                    className="text-xl font-semibold outline-none"
                  >
                    {sent
                      ? channel === "mobile"
                        ? "Check your phone"
                        : "Check your email"
                      : "Choose how to get started"}
                  </h2>
                  <p className="mt-2 mb-6 text-sm leading-6 text-muted-foreground">
                    {sent
                      ? `Enter the six-digit code sent to ${channel === "mobile" ? phone : email}. It expires 10 minutes after you requested it.`
                      : "We’ll send a verification code so your clinic can reach you about your registration."}
                  </p>
                  {sent ? (
                    <form
                      className="space-y-6"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void run(async () => {
                          const next = registrationBootSchema.parse(
                            await registrationRequest(token, "verify_code", { code }),
                          );
                          setBoot(next);
                          setStage(1);
                        });
                      }}
                    >
                      <InputOTP
                        maxLength={6}
                        value={code}
                        onChange={(value) => setCode(value.replace(/\D/g, ""))}
                        aria-label="Six-digit verification code"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        disabled={busy}
                        containerClassName="justify-center"
                      >
                        <InputOTPGroup className="gap-2">
                          {Array.from({ length: 6 }, (_, index) => (
                            <InputOTPSlot
                              key={index}
                              index={index}
                              className="size-10 rounded-lg border first:rounded-lg last:rounded-lg sm:size-12"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                      <Button className="w-full" type="submit" disabled={busy || code.length !== 6}>
                        {busy ? (
                          <LoaderCircle className="animate-spin" aria-hidden="true" />
                        ) : (
                          <ShieldCheck aria-hidden="true" />
                        )}
                        Verify {channel === "mobile" ? "mobile" : "email"}
                      </Button>
                      {channel === "mobile" && (
                        <div className="space-y-2">
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                const delivery = z
                                  .object({ state: z.string() })
                                  .parse(await registrationRequest(token, "code_status"));
                                setDeliveryNotice(
                                  delivery.state === "accepted"
                                    ? "The phone gateway accepted your SMS. Handset delivery has not been confirmed."
                                    : delivery.state === "queued" ||
                                        delivery.state === "retryable_failure"
                                      ? "Your SMS is waiting to be sent. Keep the SMSGate phone online."
                                      : "We could not confirm SMS delivery. Use a code if it arrives, or request a new one after the countdown.",
                                );
                              })
                            }
                          >
                            Check SMS delivery status
                          </Button>
                          {deliveryNotice && (
                            <p role="status" className="text-xs leading-6 text-muted-foreground">
                              {deliveryNotice}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            setSent(false);
                            setCode("");
                            setError("");
                          }}
                        >
                          <ArrowLeft aria-hidden="true" />
                          Change contact
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy || cooldown > 0}
                          onClick={() => void send()}
                        >
                          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <form
                      className="space-y-5"
                      noValidate
                      onSubmit={(event) => {
                        event.preventDefault();
                        void send();
                      }}
                    >
                      <div className="grid grid-cols-2 gap-2" aria-label="Verification method">
                        <Button
                          type="button"
                          variant={channel === "email" ? "secondary" : "outline"}
                          aria-pressed={channel === "email"}
                          disabled={busy}
                          onClick={() => setChannel("email")}
                        >
                          <Mail aria-hidden="true" />
                          Email
                        </Button>
                        <Button
                          type="button"
                          variant={channel === "mobile" ? "secondary" : "outline"}
                          aria-pressed={channel === "mobile"}
                          disabled={busy || !boot.mobile_available}
                          onClick={() => setChannel("mobile")}
                        >
                          <Smartphone aria-hidden="true" />
                          Mobile
                        </Button>
                      </div>
                      <FormField
                        id="patient-registration-contact"
                        label={channel === "mobile" ? "Your mobile number" : "Your email address"}
                      >
                        {channel === "mobile" ? (
                          <PhoneInput
                            id="patient-registration-contact"
                            value={phone}
                            onValueChange={setPhone}
                            mobileOnly
                            disabled={busy}
                            aria-required
                          />
                        ) : (
                          <Input
                            id="patient-registration-contact"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            autoCapitalize="none"
                            spellCheck={false}
                            maxLength={254}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            disabled={busy}
                            aria-required
                          />
                        )}
                      </FormField>
                      <Button className="w-full" type="submit" disabled={busy}>
                        {busy ? (
                          <LoaderCircle className="animate-spin" aria-hidden="true" />
                        ) : (
                          <ArrowRight aria-hidden="true" />
                        )}
                        Send verification code
                      </Button>
                      <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                        <Smartphone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        {boot.mobile_available
                          ? "Mobile codes are sent through the clinic’s SMSGate device."
                          : "Mobile verification is waiting for the clinic’s SMSGate connection. Email remains available."}
                      </p>
                    </form>
                  )}
                  {!sent && (
                    <div className="mt-6">
                      <GoogleSignIn
                        portal
                        busy={busy}
                        remember={false}
                        signup
                        prepare={prepareGoogle}
                        description="Google verifies your email so you can continue to patient details. Your clinic still reviews your registration."
                        onSubmit={async (credential) => {
                          await run(async () => {
                            const next = registrationBootSchema.parse(
                              await registrationRequest(token, "google_verify", { credential }),
                            );
                            setBoot(next);
                            setStage(1);
                          });
                        }}
                      />
                    </div>
                  )}
                </>
              )}
              {stage === 1 && (
                <>
                  <h2
                    id="registration-stage-title"
                    tabIndex={-1}
                    className="mb-2 text-xl font-semibold outline-none"
                  >
                    Your patient details
                  </h2>
                  <p className="mb-6 text-sm leading-6 text-muted-foreground">
                    Only the basics are needed. Your clinic will confirm your identity and review
                    your request.
                  </p>
                  <RegistrationDetails
                    email={boot.email}
                    verifiedPhone={boot.channel === "mobile" ? boot.phone : ""}
                    busy={busy}
                    onSubmit={submit}
                  />
                </>
              )}
              {stage === 2 && boot.application && (
                <RegistrationStatus
                  application={boot.application}
                  clinic={boot.clinic}
                  busy={busy}
                  onRefresh={() => void run(load)}
                />
              )}
            </section>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have patient access?{" "}
              <Link
                href="/portal/login"
                className="font-medium text-primary underline underline-offset-4"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
