"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Mail,
  ShieldCheck,
  UserRound,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PasswordInput } from "@/components/password-input";
import { PasswordGuidance } from "@/components/application/password-guidance";
import { PhoneInput } from "@/components/application/phone-input";
import { LoadingInformation } from "@/components/application/loading-information";
import { RecoveryState } from "@/components/application/recovery-state";
import { useStepFocus } from "@/components/application/use-step-focus";
import { FormField } from "@/components/form-field";
import { GoogleSignIn } from "@/features/auth/google-sign-in";
import { MfaVerificationForm } from "@/features/auth/mfa-form";
import { RecoveryCodes } from "@/features/auth/recovery-codes";
import { errorMessage } from "@/lib/auth/client";
import { StaffPhotoControl } from "./staff-photo";
import { StaffAccessSummary } from "./access-summary";
import { joinRequest, roleLabel, type JoinSnapshot } from "./client";

type Step = "email" | "code" | "profile" | "account" | "enroll" | "verify" | "recovery" | "done";
export function StaffOnboarding({
  token,
  mailPreview,
}: {
  token: string;
  mailPreview?: string | null;
}) {
  const [data, setData] = useState<JoinSnapshot | null>(null);
  const prepareGoogle = useCallback(
    () =>
      joinRequest<{ enabled: false } | { enabled: true; clientId: string; nonce: string }>(
        token,
        "google_prepare",
      ),
    [token],
  );
  const [step, setStep] = useState<Step>("email");
  useStepFocus(step, "staff-step-title");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [uri, setUri] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    let live = true;
    joinRequest<JoinSnapshot>(token, "open")
      .then((snapshot) => {
        if (!live) return;
        setData(snapshot);
        setName(snapshot.progress?.display_name ?? "");
        setPhone(snapshot.progress?.phone ?? "");
        setStep(
          snapshot.verified ? (snapshot.progress?.display_name ? "account" : "profile") : "email",
        );
        setError("");
      })
      .catch((cause) => {
        if (live) setError(errorMessage(cause));
      });
    return () => {
      live = false;
    };
  }, [token, retry]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function sendCode() {
    await run(async () => {
      await joinRequest(token, "request_code", { email });
      setCooldown(60);
      setCode("");
      setStep("code");
    });
  }
  function enterWorkspace() {
    window.location.assign(
      data?.settings.workspace_mode === "station"
        ? "/station"
        : `/clinic?organization=${data?.organization_id}`,
    );
  }
  const active = ["email", "code"].includes(step)
    ? 0
    : step === "profile"
      ? 1
      : ["account", "enroll", "verify", "recovery"].includes(step)
        ? 2
        : 3;
  const steps = [
    { label: "Verify email", icon: Mail },
    { label: "Your profile", icon: UserRound },
    { label: "Secure account", icon: ShieldCheck },
    { label: "Ready", icon: CheckCircle2 },
  ];
  const titles: Record<Step, string> = {
    email: "Join your clinic team",
    code: "Verify your email",
    profile: "Make your profile yours",
    account: data?.has_account ? "Use your existing account" : "Create your secure account",
    enroll: "Protect your account",
    verify: "Verify your account",
    recovery: "Save your recovery codes",
    done: "You’re ready to join the team",
  };
  if (!data)
    return (
      <main id="main" className="grid min-h-svh place-items-center p-6">
        {error ? (
          <RecoveryState
            title="We couldn’t open this staff invitation"
            description={error}
            icon={Mail}
          >
            <Button onClick={() => setRetry((value) => value + 1)}>
              <RotateCcw className="size-4" />
              Try again
            </Button>
            <ButtonLink href="/login" variant="outline">
              Staff sign in
            </ButtonLink>
          </RecoveryState>
        ) : (
          <LoadingInformation
            title="Opening your staff invitation"
            detail="Checking the clinic and invitation before account setup."
          />
        )}
      </main>
    );
  return (
    <div className="min-h-svh bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-5 py-5 sm:px-10">
        <Brand />
        <span className="text-sm text-muted-foreground">{data.clinic} · Staff onboarding</span>
      </header>
      <main
        id="main"
        className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[280px_1fr] lg:py-12"
      >
        <aside className="self-start rounded-2xl border border-border bg-card p-6">
          <h1 className="text-xl font-semibold break-words">Welcome to {data.clinic}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            A few steps to join your team, personalize your profile and protect your account.
          </p>
          <ol className="mt-6 grid gap-2">
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.label}
                  className={`flex items-center gap-3 rounded-lg p-3 text-sm ${active === index ? "bg-teal-soft font-semibold text-teal-ink" : "text-muted-foreground"}`}
                  aria-current={active === index ? "step" : undefined}
                >
                  <span className="grid size-8 place-items-center rounded-full border border-border bg-card">
                    {active > index ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </span>
                  {item.label}
                </li>
              );
            })}
          </ol>
          <div className="mt-6 border-t border-border pt-5 text-xs leading-6 text-muted-foreground">
            <p className="font-semibold text-foreground">Your assigned workspace</p>
            <p>{data.branch}</p>
            <p>{data.roles.map(roleLabel).join(" · ")}</p>
            <p>
              {data.settings.workspace_mode === "station"
                ? "Approved Stations only"
                : "Tools permitted by your clinic roles"}
            </p>
            <p className="mt-3">
              Your clinic controls access. Patient records still require the appropriate patient
              grants.
            </p>
          </div>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            Use the same invitation link to resume saved profile details. Contact verification may
            be needed again. Passwords and authenticator entries are not saved as profile progress.
          </p>
        </aside>
        <section className="min-w-0 rounded-2xl border border-border bg-card p-6 sm:p-9">
          <h2 id="staff-step-title" tabIndex={-1} className="text-2xl font-semibold outline-none">
            {titles[step]}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {step === "email"
              ? `Enter the email address invited by your clinic (${data.email_hint}).`
              : step === "code"
                ? `Enter the six-digit code sent to ${email}. It expires in 10 minutes.`
                : step === "profile"
                  ? "Add your name, contact number and an optional profile photo."
                  : step === "account"
                    ? data.signed_in
                      ? "You’re already signed in with the invited account. Review your assigned access and join."
                      : data.has_account
                        ? "Use your existing password and authenticator. Your credentials and existing memberships are retained."
                        : "Choose a strong password, then connect an authenticator app."
                    : ["verify", "enroll"].includes(step)
                      ? "MFA protects your clinic workspace. Existing authenticators are retained."
                      : step === "done"
                        ? "Your clinic membership and assigned access are now active."
                        : "Keep these codes somewhere safe before continuing."}
          </p>
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6"
            >
              {error}
            </p>
          )}
          <div className="mt-7">
            {step === "email" && (
              <form
                className="grid gap-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendCode();
                }}
              >
                <FormField id="staff-join-email" label="Invited email address">
                  <Input
                    id="staff-join-email"
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    maxLength={320}
                  />
                </FormField>
                <Button type="submit" disabled={busy || !email}>
                  <Mail className="size-4" />
                  {busy ? "Sending code…" : "Send verification code"}
                </Button>
              </form>
            )}
            {step === "code" && (
              <form
                className="grid gap-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(async () => {
                    const snapshot = await joinRequest<JoinSnapshot>(token, "verify_code", {
                      code,
                    });
                    setData(snapshot);
                    setName(snapshot.progress?.display_name ?? "");
                    setPhone(snapshot.progress?.phone ?? "");
                    setStep("profile");
                  });
                }}
              >
                <InputOTP
                  aria-label="Staff email verification code"
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={setCode}
                  disabled={busy}
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <Button type="submit" disabled={busy || code.length !== 6}>
                  Verify email
                  <ArrowRight className="size-4" />
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || cooldown > 0}
                    onClick={() => void sendCode()}
                  >
                    <RotateCcw className="size-4" />
                    {cooldown ? `Resend in ${cooldown}s` : "Resend code"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setStep("email");
                      setCode("");
                    }}
                  >
                    Change email entry
                  </Button>
                </div>
                {mailPreview && (
                  <p className="text-xs leading-6 text-muted-foreground">
                    Local development email is captured in{" "}
                    <a
                      className="underline underline-offset-4"
                      href={mailPreview}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mailpit
                    </a>
                    .
                  </p>
                )}
              </form>
            )}
            {step === "profile" && (
              <form
                className="grid gap-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(async () => {
                    setData(
                      await joinRequest<JoinSnapshot>(token, "profile", {
                        display_name: name,
                        phone,
                      }),
                    );
                    setStep("account");
                  });
                }}
              >
                <div className="grid items-start gap-6 sm:grid-cols-[210px_1fr]">
                  <StaffPhotoControl
                    name={name}
                    photoId={data.photo_id}
                    fields={{ token }}
                    disabled={busy}
                    onUploaded={(photo) => setData({ ...data, photo_id: photo.photo_id })}
                    onRemove={() =>
                      void run(async () =>
                        setData(await joinRequest<JoinSnapshot>(token, "remove_photo")),
                      )
                    }
                  />
                  <div className="grid gap-5">
                    <FormField id="staff-join-name" label="Display name">
                      <Input
                        id="staff-join-name"
                        required
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={160}
                      />
                    </FormField>
                    <FormField id="staff-join-phone" label="Phone number (optional)">
                      <PhoneInput id="staff-join-phone" value={phone} onValueChange={setPhone} />
                    </FormField>
                    <p className="text-xs leading-6 text-muted-foreground">
                      Your role, branch and specialty are assigned by the clinic. Ask your
                      administrator if those details need changing.
                    </p>
                  </div>
                </div>
                <Button type="submit" disabled={busy || !name.trim()}>
                  Save profile & continue
                  <ArrowRight className="size-4" />
                </Button>
              </form>
            )}
            {step === "account" && !data.signed_in && (
              <div className="mb-6 border-b border-border pb-6">
                <GoogleSignIn
                  portal={false}
                  signup={!data.has_account}
                  busy={busy}
                  remember={false}
                  prepare={prepareGoogle}
                  description="Use the invited Google account. Existing accounts must already be linked; native MFA still applies."
                  onSubmit={async (credential) => {
                    await run(async () => {
                      const result = await joinRequest<{ next_step: "enroll" | "verify" }>(
                        token,
                        "google_account",
                        { credential },
                      );
                      if (result.next_step === "enroll") {
                        const enrollment = await joinRequest<{ otpauthUri: string }>(
                          token,
                          "enroll",
                        );
                        setUri(enrollment.otpauthUri);
                      }
                      setStep(result.next_step);
                    });
                  }}
                />
              </div>
            )}
            {step === "account" && (
              <StaffAccessSummary
                value={{ ...data.settings, roles: data.roles }}
                branch={data.branch}
                permissions={data.permissions}
              />
            )}
            {step === "account" && (
              <form
                className="grid gap-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(async () => {
                    if (data.signed_in) {
                      await joinRequest(token, "accept");
                      setStep("done");
                      return;
                    }
                    const result = await joinRequest<{ next_step: "enroll" | "verify" }>(
                      token,
                      "prepare_account",
                      { password, confirm },
                    );
                    setPassword("");
                    setConfirm("");
                    if (result.next_step === "enroll") {
                      const enrollment = await joinRequest<{ otpauthUri: string }>(token, "enroll");
                      setUri(enrollment.otpauthUri);
                    }
                    setStep(result.next_step);
                  });
                }}
              >
                {!data.signed_in && (
                  <>
                    <FormField
                      id="staff-password"
                      label={data.has_account ? "Existing password" : "Password"}
                    >
                      <PasswordInput
                        id="staff-password"
                        required
                        autoComplete={data.has_account ? "current-password" : "new-password"}
                        value={password}
                        maxLength={128}
                        minLength={data.has_account ? 1 : 15}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </FormField>
                    {!data.has_account && (
                      <>
                        <PasswordGuidance password={password} />
                        <FormField id="staff-confirm" label="Confirm password">
                          <PasswordInput
                            id="staff-confirm"
                            required
                            autoComplete="new-password"
                            value={confirm}
                            maxLength={128}
                            onChange={(event) => setConfirm(event.target.value)}
                          />
                        </FormField>
                      </>
                    )}
                  </>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setStep("profile")}
                  >
                    <ArrowLeft className="size-4" />
                    Profile
                  </Button>
                  <Button type="submit" disabled={busy}>
                    <ShieldCheck className="size-4" />
                    {busy
                      ? "Checking account…"
                      : data.signed_in
                        ? "Join clinic"
                        : "Continue securely"}
                  </Button>
                </div>
              </form>
            )}
            {(step === "enroll" || step === "verify") && (
              <MfaVerificationForm
                busy={busy}
                enrollmentUri={uri || undefined}
                onSubmit={async (values) => {
                  await run(async () => {
                    const result = await joinRequest<{ recoveryCodes: string[] | null }>(
                      token,
                      "verify_mfa",
                      values,
                    );
                    setUri("");
                    if (result.recoveryCodes) {
                      setCodes(result.recoveryCodes);
                      setStep("recovery");
                    } else setStep("done");
                  });
                }}
              />
            )}
            {step === "recovery" && (
              <RecoveryCodes
                codes={codes}
                onContinue={() => {
                  setCodes([]);
                  setStep("done");
                }}
              />
            )}
            {step === "done" && (
              <div className="grid justify-items-start gap-5">
                <CheckCircle2 className="size-12 text-teal-ink" aria-hidden />
                <p className="text-sm leading-6 text-muted-foreground">
                  {data.settings.workspace_mode === "station"
                    ? "Open Station on an approved device in your assigned branch. Regular clinic pages are unavailable for this membership."
                    : "Open your workspace to view the tools your clinic assigned."}
                </p>
                <Button onClick={enterWorkspace}>
                  Open {data.settings.workspace_mode === "station" ? "Station" : "clinic workspace"}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
