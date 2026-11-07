"use client";

import { Check, Mic, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CallMedia } from "./use-call-media";

export function DeviceReadiness({ media }: { media: CallMedia }) {
  const checks = media.checks;
  return (
    <section
      className="grid min-w-0 gap-4 rounded-xl border border-border bg-card p-4"
      aria-label="Pre-call sound checks"
    >
      <div>
        <h2 className="text-sm font-semibold">Can you hear and be heard?</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          These checks run on your device. Your microphone signal is not played back or uploaded.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid content-start gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <Mic aria-hidden className="size-4 text-teal-ink" />
              Microphone
            </h3>
            {checks.microphoneDetected && (
              <span className="flex items-center gap-1 text-xs text-teal-ink">
                <Check aria-hidden className="size-3.5" />
                Signal detected
              </span>
            )}
          </div>
          <div
            role="meter"
            aria-label="Microphone input level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={checks.level}
            className="h-3 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-teal-600 transition-[width] duration-100 motion-reduce:transition-none"
              style={{ width: `${checks.level}%` }}
            />
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Choose Check microphone, allow access, then speak a few words. This checks signal, not
            sound quality.
          </p>
          <Button
            variant="outline"
            disabled={media.busy || !media.microphone}
            onClick={() => void media.checkMicrophone()}
          >
            Check microphone
          </Button>
          {!media.microphone && (
            <p className="text-xs text-muted-foreground">Turn your microphone on to check it.</p>
          )}
        </div>
        <div className="grid content-start gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <Volume2 aria-hidden className="size-4 text-teal-ink" />
              Speaker
            </h3>
            {checks.speakerConfirmed && (
              <span className="flex items-center gap-1 text-xs text-teal-ink">
                <Check aria-hidden className="size-3.5" />
                Confirmed by you
              </span>
            )}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            A short, quiet tone plays through this browser’s audio output. Adjust your volume, then
            confirm you heard it.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={checks.speakerPlaying}
              onClick={() => void checks.testSpeaker()}
            >
              {checks.speakerPlaying ? "Playing test sound…" : "Play test sound"}
            </Button>
            <Button
              variant={checks.speakerConfirmed ? "secondary" : "outline"}
              disabled={!checks.speakerPlayed || checks.speakerConfirmed}
              onClick={checks.confirmSpeaker}
            >
              <Check aria-hidden className="size-4" />I heard it
            </Button>
          </div>
        </div>
      </div>
      {checks.error && (
        <p
          role="alert"
          className={cn("rounded-lg bg-destructive/5 p-3 text-xs leading-5 text-destructive")}
        >
          {checks.error}
        </p>
      )}
    </section>
  );
}
