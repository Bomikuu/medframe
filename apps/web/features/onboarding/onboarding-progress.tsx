import { MedframeIllustration } from "@/components/illustrations/medframe-illustration";
import { Check, ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { steps, titles, type Snapshot, type Step } from "./schema";
import { onboardingPresentation } from "./onboarding-presentation";

export function OnboardingProgress({
  snapshot,
  step,
  onSelect,
  busy = false,
}: {
  snapshot: Snapshot;
  step: Step;
  onSelect: (step: Step) => void;
  busy?: boolean;
}) {
  const completed = steps.filter((value) => snapshot.completed_steps.includes(value)).length;
  const percentage = Math.round((completed / steps.length) * 100);
  const clinicName = String(snapshot.data.clinic.name || "your clinic");
  return (
    <nav
      aria-label="Clinic setup progress"
      className="min-w-0 rounded-2xl border bg-card p-4 sm:p-5 lg:sticky lg:top-5 lg:self-start"
    >
      <h2 className="text-lg font-semibold">Set up your clinic</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Get your clinic ready in a few simple steps.
      </p>
      <Progress
        value={percentage}
        aria-label="Setup completion"
        className="mt-5 h-2 [&_[data-slot=progress-indicator]]:bg-teal-600"
      />
      <div className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground tabular-nums">
        <span>
          {completed} of {steps.length} completed
        </span>
        <span>{percentage}%</span>
      </div>
      <ol className="relative mt-5 grid grid-cols-6 gap-1 lg:grid-cols-1 lg:gap-1 lg:before:absolute lg:before:top-7 lg:before:bottom-7 lg:before:left-[27px] lg:before:w-px lg:before:bg-border">
        {steps.map((value, index) => {
          const active = value === step;
          const complete = snapshot.completed_steps.includes(value);
          const locked = !active && !complete && index > steps.indexOf(snapshot.current_step);
          const Icon = onboardingPresentation[value].icon;
          return (
            <li key={value} className="relative">
              <button
                type="button"
                disabled={locked || busy}
                onClick={() => onSelect(value)}
                aria-label={`${titles[value]}${active ? ", current step" : complete ? ", completed" : locked ? ", complete earlier steps first" : ", available"}`}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "relative flex min-h-12 w-full items-center justify-center gap-3 rounded-xl px-1 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed lg:min-h-20 lg:justify-start lg:px-2",
                  active ? "bg-secondary text-teal-900 dark:text-teal-200" : "hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "relative flex size-9 shrink-0 items-center justify-center rounded-full border bg-card lg:size-10",
                    active
                      ? "border-teal-100 bg-teal-100 text-teal-700 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-300"
                      : "border-border text-muted-foreground",
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden="true" />
                  {complete && (
                    <Check
                      className="absolute -right-1 -bottom-1 size-4 rounded-full bg-teal-700 p-0.5 text-white"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="hidden min-w-0 flex-1 lg:block">
                  <span className="block text-sm leading-5 font-semibold">
                    {index + 1}. {titles[value]}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {onboardingPresentation[value].subtitle}
                  </span>
                </span>
                {active && (
                  <span
                    className="onboarding-active-dot absolute top-1 right-1 size-1.5 rounded-full bg-teal-700 lg:top-3 lg:right-2"
                    aria-hidden="true"
                  />
                )}
                {locked && <span className="sr-only">Complete earlier steps first</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm font-medium lg:hidden">{titles[step]}</p>
      <div className="mt-6 hidden border-t pt-5 lg:block">
        <MedframeIllustration name="clinic-reception" className="mx-auto mb-4 h-28 w-40" />
        <div className="flex items-start gap-2 text-sm font-semibold">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-700" aria-hidden="true" />
          <span className="break-words">A workspace for {clinicName}</span>
        </div>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          Your clinic details save as you go. Use Save and exit to return when you’re ready.
        </p>
      </div>
    </nav>
  );
}
