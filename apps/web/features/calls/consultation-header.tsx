"use client";

import { ArrowLeft, ClipboardPenLine, Clock3, Info, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { callDate } from "./call-format";
import type { CallState } from "./client";

export function ConsultationHeader({
  state,
  seconds,
  status,
  busy,
  info,
  admit,
  leave,
  openClinical,
}: {
  state: CallState;
  seconds: number;
  status: string;
  busy: boolean;
  info: () => void;
  admit: () => void;
  leave: () => void;
  openClinical?: () => void;
}) {
  const remaining = `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;
  return (
    <header className="shrink-0 border-b border-border bg-card px-3 py-2 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm! font-semibold sm:text-base!">Online consultation</h1>
          <p className="truncate text-xs text-muted-foreground">
            {state.patient ?? "Patient"} · {state.doctor ?? "Doctor"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <span
            className={cn(
              "rounded-lg px-2 py-1.5 text-xs font-medium tabular-nums sm:px-3",
              state.timing_mode === "instant"
                ? "bg-teal-soft text-teal-ink"
                : seconds <= 300
                  ? "bg-amber-50 text-amber-950"
                  : "bg-muted text-foreground",
            )}
            title={
              state.timing_mode === "instant"
                ? "Open until the doctor ends the room"
                : "Time until the room closes"
            }
            aria-label={
              state.timing_mode === "instant"
                ? "Instant room, no scheduled time limit"
                : `${remaining} remaining until room closes`
            }
          >
            <Clock3 aria-hidden className="mr-1 inline size-3.5" />
            {state.timing_mode === "instant" ? (
              "Instant room"
            ) : (
              <>
                {remaining}
                <span className="hidden xl:inline"> remaining</span>
              </>
            )}
          </span>
          {state.role === "doctor" && openClinical && (
            <Button
              variant="secondary"
              size="icon"
              className="size-11 lg:w-auto lg:px-3"
              aria-label="Open clinical workspace"
              title="Clinical workspace"
              onClick={openClinical}
            >
              <ClipboardPenLine aria-hidden className="size-4" />
              <span className="hidden lg:inline">Clinical workspace</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Appointment information"
            title="Appointment information"
            onClick={info}
          >
            <Info aria-hidden className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-11 sm:w-auto sm:px-3"
            onClick={leave}
            aria-label="Leave room"
            title="Leave room"
          >
            <ArrowLeft aria-hidden className="size-4" />
            <span className="hidden sm:inline">Leave room</span>
          </Button>
        </div>
      </div>
      <div className="mt-1 flex min-h-7 items-center justify-between gap-2 text-xs">
        <span role="status" className="flex min-w-0 items-center gap-2 font-medium text-teal-ink">
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
          <span className="truncate">{status}</span>
        </span>
        {state.role === "doctor" && state.patient_lobby && !state.patient_lobby.admitted ? (
          <Button size="sm" disabled={busy} onClick={admit}>
            <LogIn aria-hidden className="size-3.5" />
            Admit patient
          </Button>
        ) : (
          <span className="hidden truncate text-muted-foreground sm:inline">
            {state.timing_mode === "instant"
              ? "Doctor ends the room manually"
              : `${callDate(state.start, state.timezone)} · ${state.timezone ?? "Asia/Manila"}`}
          </span>
        )}
      </div>
    </header>
  );
}
