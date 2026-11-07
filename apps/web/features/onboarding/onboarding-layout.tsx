import { Brand } from "@/components/brand";
import type { ReactNode, Ref } from "react";
import Link from "next/link";
import { ChevronDown, Lightbulb } from "lucide-react";
import { OnboardingHelp } from "./onboarding-help";
import { OnboardingProgress } from "./onboarding-progress";
import { onboardingPresentation } from "./onboarding-presentation";
import { stepDetails } from "./step-details";
import { steps, titles, type Snapshot, type Step } from "./schema";

export function OnboardingHeader({
  step,
  verification = false,
  actions,
  actionsRef,
}: {
  step: Step;
  verification?: boolean;
  actions?: ReactNode;
  actionsRef?: Ref<HTMLDivElement>;
}) {
  return (
    <header className="sticky top-0 z-20 border-b bg-card">
      <div className="mx-auto grid min-h-16 max-w-[1800px] grid-cols-[1fr_auto] items-center gap-x-4 px-5 py-3 sm:flex sm:gap-5 sm:px-8">
        <Link
          href="/onboarding/setup"
          className="flex items-center gap-2.5 text-xl font-semibold tracking-tight"
        >
          <Brand />
        </Link>
        {(actionsRef || actions) && (
          <div
            ref={actionsRef}
            className="order-3 col-span-2 mt-3 flex min-w-0 items-center justify-between gap-3 border-t pt-3 sm:order-none sm:mt-0 sm:ml-auto sm:border-0 sm:pt-0"
          >
            {actions}
          </div>
        )}
        <div className={actionsRef || actions ? "sm:border-l sm:pl-4" : "sm:ml-auto"}>
          <OnboardingHelp step={step} verification={verification} />
        </div>
      </div>
    </header>
  );
}

function GuidanceContent({ step }: { step: Step }) {
  const details = onboardingPresentation[step];
  return (
    <>
      <p className="text-sm leading-6 text-muted-foreground">{details.why}</p>
      <ul className="mt-6 space-y-6 border-t pt-6">
        {details.benefits.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm leading-6 font-semibold">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function OnboardingLayout({
  snapshot,
  step,
  onSelect,
  busy = false,
  children,
}: {
  snapshot: Snapshot;
  step: Step;
  onSelect: (step: Step) => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const Icon = onboardingPresentation[step].icon;
  return (
    <div className="onboarding-backdrop min-h-[calc(100svh-4rem)]">
      <main
        id="main"
        className="mx-auto grid max-w-[1800px] items-start gap-5 px-4 py-5 sm:px-7 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_270px] 2xl:grid-cols-[290px_minmax(0,1fr)_290px]"
      >
        <OnboardingProgress snapshot={snapshot} step={step} busy={busy} onSelect={onSelect} />
        <section
          aria-labelledby="setup-step-title"
          className="min-w-0 overflow-hidden rounded-2xl border bg-card"
        >
          <div className="flex items-start justify-between gap-5 border-b px-5 py-6 sm:px-8 sm:py-7">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Step {steps.indexOf(step) + 1} of {steps.length}
              </p>
              <h1
                id="setup-step-title"
                tabIndex={-1}
                className="text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
              >
                {titles[step]}
              </h1>
              <p className="mt-2 max-w-[65ch] text-sm leading-6 text-muted-foreground">
                {stepDetails[step].description}
              </p>
            </div>
            <span className="hidden size-14 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 sm:flex dark:bg-teal-950 dark:text-teal-300">
              <Icon className="size-7" aria-hidden="true" />
            </span>
          </div>
          <div className="px-5 py-5 sm:px-8 sm:py-6">{children}</div>
        </section>
        <aside
          className="min-w-0 lg:col-start-2 xl:sticky xl:top-5 xl:col-start-auto"
          aria-label="Setup guidance"
        >
          <div className="hidden rounded-2xl border border-teal-100 bg-card p-5 xl:block dark:border-border">
            <h2 className="mb-3 text-lg font-semibold">Why this matters</h2>
            <GuidanceContent step={step} />
          </div>
          <details key={step} className="group rounded-2xl border bg-card p-5 xl:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <Lightbulb className="size-4 text-teal-700" aria-hidden="true" />
              Why this matters
              <ChevronDown
                className="ml-auto size-4 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="mt-4">
              <GuidanceContent step={step} />
            </div>
          </details>
        </aside>
      </main>
    </div>
  );
}
