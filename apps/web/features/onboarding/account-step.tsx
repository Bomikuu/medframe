"use client";
import { LoaderCircle, UserRound, ShieldCheck, Check } from "lucide-react";
import { PasswordGuidance } from "@/components/application/password-guidance";
import { OnboardingNotice } from "./onboarding-notice";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { FormField } from "@/components/form-field";
import { MfaVerificationForm } from "@/features/auth/mfa-form";
import { requestWithCsrf } from "@/lib/auth/client";
import { message } from "./client";
export function AccountStep({
  email,
  onReady,
  onDirtyChange,
}: {
  email: string;
  onReady: (value: unknown) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [mode, setMode] = useState<"new" | "existing">("new"),
    [stage, setStage] = useState("account"),
    [uri, setUri] = useState<string>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [codes, setCodes] = useState<string[]>([]),
    [result, setResult] = useState<unknown>();
  const form = useForm({
    mode: "onTouched",
    shouldUnregister: true,
    defaultValues: {
      first_name: "",
      last_name: "",
      password: "",
      confirm: "",
      terms: false,
      privacy: false,
    },
  });
  const accountValues = form.watch();
  useEffect(() => {
    onDirtyChange?.(
      stage !== "account" ||
        Boolean(
          accountValues.first_name ||
          accountValues.last_name ||
          accountValues.password ||
          accountValues.confirm ||
          accountValues.terms ||
          accountValues.privacy,
        ),
    );
  }, [
    onDirtyChange,
    stage,
    accountValues.first_name,
    accountValues.last_name,
    accountValues.password,
    accountValues.confirm,
    accountValues.terms,
    accountValues.privacy,
  ]);
  const submit = form.handleSubmit(async (values) => {
    setBusy(true);
    setError("");
    try {
      const next = await requestWithCsrf<{ next_step: string }>("onboarding/account/prepare", {
        ...values,
        mode,
      });
      form.reset({ ...values, password: "", confirm: "" });
      if (next.next_step === "enroll")
        setUri(
          (await requestWithCsrf<{ otpauthUri: string }>("onboarding/account/mfa/enroll", {}))
            .otpauthUri,
        );
      setStage("mfa");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  });
  return (
    <div className="w-full max-w-xl">
      <p className="mb-7 text-sm leading-7 text-muted-foreground">
        Administrator identity: <strong className="text-foreground">{email}</strong>. Your clinic
        account does not automatically receive clinical permissions.
      </p>
      {error && (
        <div className="mb-5">
          <OnboardingNotice tone="error">{error}</OnboardingNotice>
        </div>
      )}
      {stage === "account" ? (
        <form noValidate onSubmit={submit} className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">
              {mode === "new" ? "Create your account" : "Sign in to your account"}
            </h2>
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setMode(mode === "new" ? "existing" : "new");
                form.clearErrors();
                setError("");
              }}
            >
              <UserRound aria-hidden="true" />
              {mode === "new" ? "Already using Medframe? Sign in" : "Create a new account"}
            </Button>
          </div>
          {mode === "new" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="first-name"
                label="First name"
                error={form.formState.errors.first_name?.message}
              >
                <Input
                  id="first-name"
                  autoComplete="given-name"
                  maxLength={80}
                  aria-invalid={Boolean(form.formState.errors.first_name)}
                  aria-describedby="first-name-help"
                  {...form.register("first_name", {
                    required: "Enter your first name.",
                    validate: (value) => Boolean(value.trim()) || "Enter your first name.",
                  })}
                />
              </FormField>
              <FormField id="last-name" label="Last name">
                <Input
                  id="last-name"
                  autoComplete="family-name"
                  maxLength={80}
                  {...form.register("last_name")}
                />
              </FormField>
            </div>
          )}
          <FormField
            id="account-password"
            label={mode === "new" ? "Password" : "Existing password"}
            hint="15–128 characters. Your password is never saved in the setup draft."
            error={form.formState.errors.password?.message}
          >
            <PasswordInput
              id="account-password"
              autoComplete={mode === "new" ? "new-password" : "current-password"}
              maxLength={128}
              aria-invalid={Boolean(form.formState.errors.password)}
              aria-describedby={`account-password-help${mode === "new" ? " password-guidance" : ""}`}
              {...form.register("password", {
                required: "Enter your password.",
                minLength: { value: 15, message: "Use at least 15 characters." },
                maxLength: { value: 128, message: "Use no more than 128 characters." },
                deps: ["confirm"],
              })}
            />
          </FormField>
          {mode === "new" && <PasswordGuidance password={form.watch("password")} />}
          {mode === "new" && (
            <FormField
              id="account-confirm"
              label="Confirm password"
              error={form.formState.errors.confirm?.message}
            >
              <PasswordInput
                id="account-confirm"
                autoComplete="new-password"
                maxLength={128}
                aria-invalid={Boolean(form.formState.errors.confirm)}
                aria-describedby="account-confirm-help"
                {...form.register("confirm", {
                  required: "Confirm your password.",
                  validate: (value) =>
                    mode !== "new" ||
                    value === form.getValues("password") ||
                    "The passwords do not match.",
                })}
              />
            </FormField>
          )}
          <label className="flex items-start gap-3 text-sm leading-6">
            <Controller
              name="terms"
              control={form.control}
              rules={{ required: "Acknowledge this notice to continue." }}
              render={({ field }) => (
                <Checkbox
                  className="mt-1"
                  aria-label="Acknowledge terms notice"
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(value === true)}
                />
              )}
            />
            <span>
              I acknowledge the{" "}
              <Link
                target="_blank"
                href="/onboarding/notices/terms"
                className="underline underline-offset-4"
              >
                development-use terms
              </Link>
              .
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm leading-6">
            <Controller
              name="privacy"
              control={form.control}
              rules={{ required: "Acknowledge this notice to continue." }}
              render={({ field }) => (
                <Checkbox
                  className="mt-1"
                  aria-label="Acknowledge privacy notice"
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(value === true)}
                />
              )}
            />
            <span>
              I have read the{" "}
              <Link
                target="_blank"
                href="/onboarding/notices/privacy"
                className="underline underline-offset-4"
              >
                development privacy notice
              </Link>
              .
            </span>
          </label>
          {form.formState.errors.terms && (
            <p role="alert" className="text-sm text-destructive">
              Read and acknowledge the development-use terms.
            </p>
          )}
          {form.formState.errors.privacy && (
            <p role="alert" className="text-sm text-destructive">
              Read and acknowledge the privacy notice.
            </p>
          )}
          {Object.keys(form.formState.errors).length > 0 && (
            <OnboardingNotice tone="error">
              Review the highlighted account fields and acknowledgements before continuing.
            </OnboardingNotice>
          )}
          <Button disabled={busy} type="submit">
            {busy ? (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <ShieldCheck aria-hidden="true" />
            )}
            {busy ? "Checking account…" : "Continue to verification"}
          </Button>
        </form>
      ) : stage === "mfa" ? (
        <MfaVerificationForm
          busy={busy}
          enrollmentUri={uri}
          onSubmit={async (values) => {
            setBusy(true);
            setError("");
            try {
              const response = await requestWithCsrf<{
                snapshot: unknown;
                recoveryCodes: string[];
              }>("onboarding/account/mfa/verify", values);
              if (response.recoveryCodes.length) {
                setCodes(response.recoveryCodes);
                setResult(response.snapshot);
                setStage("codes");
              } else onReady(response.snapshot);
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : (
        <section>
          <h2 className="text-lg font-semibold">Save your recovery codes</h2>
          <p className="my-4 text-sm leading-7 text-muted-foreground">
            Each code works once. Save these securely before continuing; they are not included in
            your onboarding draft.
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-4 font-mono text-xs">
            {codes.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
          <Button
            className="mt-6"
            onClick={() => {
              setCodes([]);
              onReady(result);
            }}
          >
            <Check aria-hidden="true" />I have saved my recovery codes
          </Button>
        </section>
      )}
    </div>
  );
}
