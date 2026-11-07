"use client";

import {
  MedframeIllustration,
  type IllustrationName,
} from "@/components/illustrations/medframe-illustration";
import { Brand } from "@/components/brand";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  HeartPulse,
  Stethoscope,
  ClipboardList,
  ScanLine,
  CalendarDays,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const slideIllustrations: IllustrationName[] = [
  "clinic-reception",
  "medical-records",
  "doctor-profile",
  "appointment-booking",
  "appointment-confirmed",
];

const slides = [
  {
    title: "A new chapter for your clinic.",
    detail:
      "Welcome to Medframe. Bring your patients, clinical records and everyday care into one connected workspace.",
    label: "Welcome",
    icon: HeartPulse,
  },
  {
    title: "More context for every consultation.",
    detail:
      "Keep patient records, clinical notes, diagnoses and treatment plans together, so the next visit starts with the full picture.",
    label: "Patient care",
    icon: ClipboardList,
  },
  {
    title: "Bring your findings into focus.",
    detail:
      "Use interactive dental charts and anatomical views to document where a finding belongs, alongside your clinical notes.",
    label: "Clinical visualization",
    icon: ScanLine,
  },
  {
    title: "Keep the next step connected.",
    detail:
      "Coordinate appointments, follow-ups and patient communication around the care you provide. SMS delivery remains a preview.",
    label: "Everyday practice",
    icon: CalendarDays,
  },
  {
    title: "Make room for your way of working.",
    detail:
      "Add your clinic details, choose specialties and set your opening hours. You can fine-tune schedules and team access later.",
    label: "Your workspace",
    icon: Building2,
  },
];

export function WelcomeSlides({
  onStart,
  busy,
}: {
  onStart: (skipped: boolean) => void;
  busy: boolean;
}) {
  const [slide, setSlide] = useState(0);
  const touch = useRef(0);
  const current = slides[slide];
  const Icon = current.icon;
  const change = (delta: number) =>
    setSlide((value) => Math.max(0, Math.min(slides.length - 1, value + delta)));
  return (
    <div className="onboarding-backdrop flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Brand />
        <Button variant="ghost" disabled={busy} onClick={() => onStart(true)}>
          Skip introduction
          <ArrowRight aria-hidden="true" />
        </Button>
      </header>
      <main
        id="main"
        className="mx-auto flex w-full max-w-6xl flex-1 items-center px-5 py-8 sm:px-8"
      >
        <section
          className="grid w-full overflow-hidden rounded-2xl bg-card shadow-[var(--panel-shadow)] lg:grid-cols-2"
          aria-roledescription="carousel"
          aria-label="Introduction to Medframe"
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") change(1);
            if (event.key === "ArrowLeft") change(-1);
          }}
          onTouchStart={(event) => {
            touch.current = event.changedTouches[0].clientX;
          }}
          onTouchEnd={(event) => {
            const delta = touch.current - event.changedTouches[0].clientX;
            if (Math.abs(delta) > 60) change(delta > 0 ? 1 : -1);
          }}
        >
          <div className="flex flex-col p-6 sm:p-10 lg:min-h-[520px] lg:p-12">
            <div className="mb-8 flex items-center justify-between gap-3">
              <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-teal-800">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {slide + 1} / {slides.length}
              </span>
            </div>
            <div aria-live="polite" aria-atomic="true" className="flex-1">
              <h1 className="max-w-md text-3xl leading-tight font-semibold tracking-tight text-primary sm:text-4xl">
                {current.title}
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
                {current.detail}
              </p>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                disabled={busy}
                onClick={() => (slide === slides.length - 1 ? onStart(false) : change(1))}
              >
                {busy
                  ? "Preparing setup…"
                  : slide === slides.length - 1
                    ? "Set up my clinic"
                    : "Next"}
                <ArrowRight aria-hidden="true" />
              </Button>
              <Button variant="ghost" disabled={slide === 0 || busy} onClick={() => change(-1)}>
                <ArrowLeft aria-hidden="true" />
                Back
              </Button>
            </div>
            <div className="mt-7 flex gap-1" role="group" aria-label="Introduction slides">
              {slides.map((item, index) => (
                <button
                  type="button"
                  key={item.label}
                  aria-label={`Slide ${index + 1}: ${item.label}`}
                  aria-current={slide === index ? "step" : undefined}
                  onClick={() => setSlide(index)}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span
                    className={cn(
                      "h-2 rounded-full transition-all motion-reduce:transition-none",
                      slide === index ? "w-8 bg-teal-700" : "w-2 bg-slate-300",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="relative flex min-h-80 items-center justify-center bg-secondary px-8 pt-8 pb-32 sm:min-h-96 lg:min-h-full">
            <MedframeIllustration name={slideIllustrations[slide]} className="w-full max-w-sm" />
            <div className="absolute right-5 bottom-5 left-5 rounded-xl bg-white p-4 sm:right-8 sm:bottom-8 sm:left-8">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Stethoscope className="size-4 text-teal-700" aria-hidden="true" />
                Built around the care you provide
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Your clinical workspace starts with a few essentials.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="px-5 py-5 text-center text-xs text-muted-foreground">
        The Foundation of Modern Care.
      </footer>
    </div>
  );
}
