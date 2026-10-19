"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HeartPulse, Check, HelpCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { onboardingClient, message, errorCode } from "./client";
import {
  bootstrapSchema,
  referencesSchema,
  steps,
  titles,
  type Step,
  type References,
} from "./schema";
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
export function OnboardingFlow({ token }: { token?: string }) {
  const model = useOnboarding(),
    [view, setView] = useState("loading"),
    [step, setStep] = useState<Step>("clinic"),
    [masked, setMasked] = useState("your invited address"),
    [references, setReferences] = useState<References | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [completed, setCompleted] = useState<string>(),
    started = useRef(false);
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
  useEffect(() => {
    if (!snapshot?.logo || !["pending", "unavailable"].includes(snapshot.logo.state)) return;
    const timer = setInterval(() => {
      void model.reload().catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, [snapshot?.logo, model.reload]);
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
  if (view === "loading")
    return (
      <main className="p-12 text-center text-sm text-muted-foreground" role="status">
        Preparing your clinic setup…
      </main>
    );
  if (view === "intro")
    return (
      <>
        <WelcomeSlides onStart={(skipped) => void start(skipped)} busy={busy} />
        {error && (
          <p role="alert" className="p-5 text-destructive">
            {error}
          </p>
        )}
      </>
    );
  const header = (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href="/onboarding/setup" className="flex items-center gap-2 text-lg font-semibold">
          <HeartPulse className="text-teal-700" />
          Medframe
        </Link>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <HelpCircle />
              Help
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>A little guidance</DialogTitle>
            <DialogDescription>
              Setup is saved on the server after a confirmed save. Use your original invitation and
              verify the invited email to return on another device. Provider permissions and
              advanced scheduling are configured after your clinic is created.
            </DialogDescription>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
  if (view === "verify")
    return (
      <>
        {header}
        <VerificationStep email={masked} onVerified={ready} onAccount={() => setView("account")} />
      </>
    );
  if (view === "account")
    return (
      <>
        {header}
        <main className="mx-auto max-w-xl px-6 py-12">
          <h1 className="mb-6 text-3xl font-semibold">Welcome back</h1>
          <AccountStep email={masked} onReady={ready} />
        </main>
      </>
    );
  if (view === "done" && completed)
    return (
      <>
        {header}
        <main className="mx-auto max-w-xl px-6 py-16">
          <div className="mb-7 grid size-14 place-items-center rounded-full bg-teal-50 text-teal-700">
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
        <main className="mx-auto max-w-lg px-6 py-16">
          <h1 className="text-3xl font-semibold">
            {view === "completed"
              ? "This invitation is completed"
              : view === "paused"
                ? "Your progress is saved"
                : "Invitation unavailable"}
          </h1>
          <p className="mt-5 text-sm leading-7 text-muted-foreground">
            {view === "paused"
              ? "Return using your original invitation link and verify your email. Your saved clinic information will be restored."
              : error ||
                "This link may be expired or revoked. Ask the platform administrator to issue another invitation, or sign in if setup is already complete."}
          </p>
          <Button className="mt-8" variant="outline" asChild>
            <Link href="/login">Go to sign in</Link>
          </Button>
          {view === "paused" && (
            <Button className="mt-8 ml-2" onClick={() => setView("verify")}>
              Continue setup
            </Button>
          )}
        </main>
      </>
    );
  const index = steps.indexOf(step);
  return (
    <>
      {header}
      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-16 lg:py-12">
        <nav aria-label="Clinic setup progress" className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-3 text-sm font-medium">Step {index + 1} of 6</p>
          <Progress
            value={(snapshot.completed_steps.length / 6) * 100}
            aria-label="Setup completion"
            className="h-1.5"
          />
          <ol className="mt-6 hidden space-y-2 lg:block">
            {steps.map((value, i) => (
              <li key={value}>
                <button
                  type="button"
                  disabled={
                    value !== step &&
                    !snapshot.completed_steps.includes(value) &&
                    i > steps.indexOf(snapshot.current_step)
                  }
                  onClick={() => setStep(value)}
                  aria-current={value === step ? "step" : undefined}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-muted-foreground disabled:opacity-50 aria-[current=step]:bg-teal-50 aria-[current=step]:font-semibold aria-[current=step]:text-teal-900"
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-full border text-[10px]">
                    {snapshot.completed_steps.includes(value) ? (
                      <Check className="size-3" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  {titles[value]}
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-6 hidden text-xs leading-6 text-muted-foreground">
            Setting up
            <br />
            <strong className="wrap-anywhere text-foreground">
              {String(snapshot.data.clinic.name || "your clinic")}
            </strong>
          </p>
        </nav>
        <section className="max-w-2xl min-w-0">
          <h1 className="text-3xl font-semibold">{titles[step]}</h1>
          <p className="mt-3 mb-7 text-sm leading-7 text-muted-foreground">
            {step === "review"
              ? "Take a moment to check your workspace. You can edit any section."
              : step === "branding"
                ? `Give ${snapshot.data.clinic.name || "your clinic"} a familiar look. Your preview stays private until setup is complete.`
                : "Just the essentials to get your clinical workspace ready."}
          </p>
          {steps.indexOf(step) < 4 ? (
            <StepForm
              key={step}
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
              <div className="mb-6 flex justify-end">
                <Button variant="ghost" onClick={() => setView("paused")}>
                  Save and exit
                </Button>
              </div>
              <AccountStep email={snapshot.email} onReady={ready} />
              <Button className="mt-6" variant="outline" onClick={() => setStep("practice")}>
                Back
              </Button>
            </>
          ) : (
            <>
              <div className="mb-6 flex justify-end">
                <Button variant="ghost" onClick={() => setView("paused")}>
                  Save and exit
                </Button>
              </div>
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
        </section>
      </main>
    </>
  );
}
