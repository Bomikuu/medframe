"use client";
import { useState, useRef } from "react";
import { ArrowLeft, ArrowRight, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductPreview } from "./product-preview";
const slides = [
  [
    "Welcome to Medframe",
    "The foundation of modern care.",
    "Manage your practice, patients, and clinical workflows in one connected platform.",
  ],
  [
    "Your practice, organized.",
    "More context. Less friction.",
    "Manage patient records, consultations, diagnoses, and treatment plans from one workspace.",
  ],
  [
    "A clearer way to visualize care.",
    "Bring findings into focus.",
    "Document clinical findings using interactive dental charts and anatomical visualizations.",
  ],
  [
    "Better coordination. Better care.",
    "Keep the next step connected.",
    "Connect clinical workflows with appointments, patient communication, and follow-ups. SMS delivery remains a preview.",
  ],
  [
    "Let's set up your clinic.",
    "A workspace that feels like yours.",
    "Tell us about your practice, personalize your workspace, and add your team when you're ready.",
  ],
];
export function WelcomeSlides({
  onStart,
  busy,
}: {
  onStart: (skipped: boolean) => void;
  busy: boolean;
}) {
  const [slide, setSlide] = useState(0),
    [learn, setLearn] = useState(false);
  const touch = useRef(0);
  const change = (delta: number) => setSlide((value) => Math.max(0, Math.min(4, value + delta)));
  return (
    <div
      className="flex min-h-dvh flex-col bg-white"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") change(1);
        if (event.key === "ArrowLeft") change(-1);
      }}
    >
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-7 sm:px-12">
        <span className="flex items-center gap-2 text-lg font-semibold">
          <HeartPulse className="text-teal-700" />
          Medframe
        </span>
        <Button variant="ghost" disabled={busy} onClick={() => onStart(true)}>
          Skip introduction
          <ArrowRight />
        </Button>
      </header>
      <main
        className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-6 py-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-16 lg:px-12"
        aria-roledescription="carousel"
        aria-label="Introduction to Medframe"
        onTouchStart={(event) => {
          touch.current = event.changedTouches[0].clientX;
        }}
        onTouchEnd={(event) => {
          const delta = touch.current - event.changedTouches[0].clientX;
          if (Math.abs(delta) > 60) change(delta > 0 ? 1 : -1);
        }}
      >
        <div aria-live="polite">
          <h1 className="max-w-xl text-4xl leading-[1.12] font-semibold tracking-tight text-primary sm:text-5xl">
            {slides[slide][0]}
          </h1>
          <p className="mt-6 text-lg font-medium text-teal-800">{slides[slide][1]}</p>
          <p className="mt-4 max-w-md text-base leading-8 text-muted-foreground">
            {slides[slide][2]}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              disabled={busy}
              onClick={() => (slide === 4 ? onStart(false) : change(1))}
            >
              {slide === 4 ? "Get started" : "Next"}
              <ArrowRight />
            </Button>
            {slide === 4 && (
              <Button size="lg" variant="outline" onClick={() => setLearn(!learn)}>
                Learn more
              </Button>
            )}
          </div>
          {learn && (
            <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
              Medframe brings patient records, consultations, clinical visualization and treatment
              management together. You can configure scheduling, team access and templates after
              your clinic is ready.
            </p>
          )}
        </div>
        <ProductPreview slide={slide} />
      </main>
      <footer className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-8 sm:px-12">
        <Button variant="ghost" disabled={slide === 0} onClick={() => change(-1)}>
          <ArrowLeft />
          Previous
        </Button>
        <div className="flex gap-2" role="group" aria-label="Introduction slides">
          {slides.map((item, index) => (
            <button
              key={item[0]}
              aria-label={`Slide ${index + 1}: ${item[0]}`}
              aria-current={slide === index ? "step" : undefined}
              onClick={() => setSlide(index)}
              className={`h-3 rounded-full outline-offset-4 ${slide === index ? "w-8 bg-teal-700" : "w-3 bg-slate-200 hover:bg-slate-400"}`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{slide + 1} / 5</span>
      </footer>
    </div>
  );
}
