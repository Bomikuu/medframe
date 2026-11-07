"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  LogOut,
  UserPlus,
  LogIn,
  ShieldAlert,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { RecoveryState } from "@/components/application/recovery-state";
import { LoadingInformation } from "@/components/application/loading-information";
import { useStepFocus } from "@/components/application/use-step-focus";
import { LogoStatusCheck } from "./logo-status-check";
import { OnboardingHeader, OnboardingLayout } from "./onboarding-layout";
import { OnboardingNotice } from "./onboarding-notice";
import { onboardingClient, message, errorCode } from "./client";
import { bootstrapSchema, referencesSchema, steps, type Step, type References } from "./schema";
import {
  OnboardingBootDocument,
  ExchangeClinicInviteDocument,
  FinishClinicIntroDocument,
} from "@/lib/graphql/onboarding/generated";
import { useOnboarding } from "./use-onboarding";
import { WelcomeSlides } from "./welcome-slides";
import { VerificationStep } from "./verification-step";
import { AccountStep } from "./account-step";
import { StepForm } from "./step-form";
import { ReviewStep } from "./review-step";
export function OnboardingFlow({
  token,
  localInboxUrl,
}: {
  token?: string;
  localInboxUrl?: string;
}) {
  const model = useOnboarding(),
    [view, setView] = useState("loading"),
    [step, setStep] = useState<Step>("clinic"),
    [masked, setMasked] = useState("your invited address"),
    [references, setReferences] = useState<References | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [completed, setCompleted] = useState<string>(),
    started = useRef(false);
  const [headerTarget, setHeaderTarget] = useState<HTMLDivElement | null>(null);
  useStepFocus(`${view}:${step}`, "setup-step-title");
  const [accountDirty, setAccountDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<Step | "exit" | null>(null);
  const navigation = useRef<((next: Step) => Promise<void>) | null>(null);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function load() {
      try {
        if (token) {
          await onboardingClient().request(ExchangeClinicInviteDocument, { token });
          window.history.replaceState(null, "", "/onboarding/setup");
        }
        const response = await onboardingClient().request(OnboardingBootDocument, {});
        const boot = bootstrapSchema.parse(response.onboardingInvitation);
        setMasked(boot.masked_email);
        setReferences(
          referencesSchema.parse({
            specialties: response.availableSpecialties,
            clinicTypes: response.availableClinicTypes,
            presets: response.brandingPresets,
          }),
        );
        if (["invalid", "expired", "revoked", "completed"].includes(boot.status)) {
          setView(boot.status);
          return;
        }
        if (boot.verified) {
          try {
            const snapshot = await model.reload();
            setStep(snapshot.current_step);
            if (snapshot.completion) {
              setCompleted(snapshot.completion.organization_id);
              setView("done");
            } else setView("setup");
          } catch (e) {
            setView(errorCode(e) === "ACCOUNT_REQUIRED" ? "account" : "verify");
          }
        } else setView(boot.intro_status === "not_started" ? "intro" : "verify");
      } catch (e) {
        setError(message(e));
        setView("invalid");
      }
    }
    void load();
  }, [token, model]);
  const snapshot = model.snapshot;
  function leaveAccount(next: Step | "exit") {
    if (accountDirty) setPendingNavigation(next);
    else if (next === "exit") setView("paused");
    else setStep(next);
  }
  function ready(value: unknown) {
    const accepted = model.accept(value);
    setStep(accepted.current_step);
    setView("setup");
  }
  async function start(skipped: boolean) {
    setBusy(true);
    try {
      await onboardingClient().request(FinishClinicIntroDocument, { skipped });
      setView("verify");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function resume() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await onboardingClient().request(OnboardingBootDocument, {});
      const boot = bootstrapSchema.parse(response.onboardingInvitation);
      setMasked(boot.masked_email);
      if (["invalid", "expired", "revoked", "completed"].includes(boot.status)) {
        setView(boot.status);
        return;
      }
      if (!boot.verified) {
        setView("verify");
        return;
      }
      const saved = await model.reload();
      setStep(saved.current_step);
      if (saved.completion) {
        setCompleted(saved.completion.organization_id);
        setView("done");
      } else setView("setup");
    } catch (cause) {
      const code = errorCode(cause);
      if (code === "ACCOUNT_REQUIRED") setView("account");
      else if (code === "VERIFICATION_REQUIRED") setView("verify");
      else setError(message(cause));
    } finally {
      setBusy(false);
    }
  }
  if (view === "loading")
    return (
      <main id="main" className="onboarding-backdrop grid min-h-svh place-items-center p-6">
        <LoadingInformation
          title="Preparing your clinic setup"
          detail="Checking your invitation and retrieving your saved progress."
        />
      </main>
    );
  if (view === "intro")
    return (
      <>
        <WelcomeSlides onStart={(skipped) => void start(skipped)} busy={busy} />
        {error && (
          <div className="fixed right-5 bottom-5 left-5 z-50 mx-auto max-w-xl">
            <OnboardingNotice tone="error">{error}</OnboardingNotice>
          </div>
        )}
      </>
    );
  const setupActions =
    view === "setup" && (step === "account" || step === "review") ? (
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => (step === "account" ? leaveAccount("exit") : setView("paused"))}
      >
        <LogOut aria-hidden="true" />
        Save and exit
      </Button>
    ) : null;
  const header = (
    <OnboardingHeader
      step={step}
      verification={view === "verify"}
      actions={setupActions}
      actionsRef={view === "setup" && steps.indexOf(step) < 4 ? setHeaderTarget : undefined}
    />
  );
  if (view === "verify")
    return (
      <>
        {header}
        <VerificationStep
          email={masked}
          localInboxUrl={localInboxUrl}
          onVerified={ready}
          onAccount={() => setView("account")}
        />
      </>
    );
  if (view === "account")
    return (
      <>
        {header}
        <main id="main" className="onboarding-backdrop min-h-[calc(100svh-5rem)] px-5 py-10">
          <section className="mx-auto max-w-xl rounded-2xl border bg-card p-6 sm:p-9">
            <h1 className="mb-6 text-3xl font-semibold">Welcome back</h1>
            <AccountStep email={masked} onReady={ready} />
          </section>
        </main>
      </>
    );
  if (view === "done" && completed)
    return (
      <>
        {header}
        <main className="mx-auto max-w-xl px-6 py-16">
          <div className="mb-7 grid size-14 place-items-center rounded-full bg-teal-soft text-teal-ink">
            <Check />
          </div>
          <h1 className="text-4xl font-semibold">Your clinic is ready.</h1>
          <p className="mt-5 text-lg font-medium">
            {String(snapshot?.data.clinic.name ?? "Welcome to Medframe")}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Your workspace has been created. Start with your first patient, and configure the rest
            when you’re ready.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/clinic?organization=${completed}`}>
                Go to dashboard
                <ArrowRight />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/clinic/patients/new?organization=${completed}`}>
                <UserPlus aria-hidden="true" />
                Register first patient
              </Link>
            </Button>
          </div>
        </main>
      </>
    );
  if (view !== "setup" || !snapshot || !references)
    return (
      <>
        {header}
        <main
          id="main"
          className="onboarding-backdrop grid min-h-[calc(100svh-5rem)] place-items-center px-5 py-8"
        >
          <RecoveryState
            level={1}
            icon={view === "paused" || view === "completed" ? Check : ShieldAlert}
            title={
              view === "completed"
                ? "This invitation is complete"
                : view === "paused"
                  ? "Your progress is saved"
                  : view === "expired"
                    ? "This invitation has expired"
                    : view === "revoked"
                      ? "This invitation was revoked"
                      : "Invitation unavailable"
            }
            description={
              view === "paused"
                ? "Your saved clinic details are kept. Continue setup here, or return using the same invitation link and verify your email when requested. Passwords and unfinished account verification are not saved in the clinic draft."
                : error ||
                  "This invitation can’t open clinic setup. Ask your platform administrator for an updated invitation, or sign in if setup is already complete."
            }
          >
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              {view === "paused" && (
                <Button disabled={busy} aria-busy={busy} onClick={() => void resume()}>
                  {busy ? "Checking saved setup…" : "Continue setup"}
                  {busy ? (
                    <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
                  ) : (
                    <ArrowRight aria-hidden="true" />
                  )}
                </Button>
              )}
              <Button disabled={busy} variant={view === "paused" ? "outline" : "default"} asChild>
                <Link href="/login">
                  <LogIn aria-hidden="true" />
                  Go to sign in
                </Link>
              </Button>
            </div>
            {view === "paused" && error && (
              <OnboardingNotice tone="error">{error}</OnboardingNotice>
            )}
          </RecoveryState>
        </main>
      </>
    );
  const index = steps.indexOf(step);
  return (
    <>
      {header}
      <OnboardingLayout
        snapshot={snapshot}
        step={step}
        busy={busy}
        onSelect={(next) => {
          if (busy || next === step) return;
          if (steps.indexOf(step) < 4 && navigation.current) {
            setBusy(true);
            void navigation.current(next).finally(() => setBusy(false));
          } else if (step === "account") leaveAccount(next);
          else setStep(next);
        }}
      >
        <LogoStatusCheck logo={snapshot.logo} reload={model.reload} />
        {steps.indexOf(step) < 4 ? (
          <StepForm
            key={step}
            headerTarget={headerTarget}
            navigation={navigation}
            step={step}
            snapshot={snapshot}
            references={references}
            save={model.saveStep}
            accept={model.accept}
            version={() => model.current.current?.version ?? snapshot.version}
            onContinue={setStep}
            onBack={() => setStep(steps[Math.max(0, index - 1)])}
            onExit={() => setView("paused")}
          />
        ) : step === "account" ? (
          <>
            <AccountStep
              email={snapshot.email}
              onDirtyChange={setAccountDirty}
              onReady={(value) => {
                setAccountDirty(false);
                ready(value);
              }}
            />
            <Button className="mt-6" variant="outline" onClick={() => leaveAccount("practice")}>
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
          </>
        ) : (
          <>
            <ReviewStep
              snapshot={snapshot}
              references={references}
              onEdit={setStep}
              busy={busy}
              error={error}
              onComplete={async () => {
                setBusy(true);
                setError("");
                try {
                  const result = await model.complete();
                  setCompleted(result.organization_id);
                  setView("done");
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </>
        )}
      </OnboardingLayout>
      <AlertDialog
        open={pendingNavigation !== null}
        onOpenChange={(open) => {
          if (!open) setPendingNavigation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Leave account setup?</AlertDialogTitle>
          <AlertDialogDescription>
            Your saved clinic details will be kept. Account entries and the current verification
            screen will be cleared when you leave. Passwords are never stored in the setup draft.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = pendingNavigation;
                setPendingNavigation(null);
                setAccountDirty(false);
                if (target === "exit") setView("paused");
                else if (target) setStep(target);
              }}
            >
              Leave this step
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
