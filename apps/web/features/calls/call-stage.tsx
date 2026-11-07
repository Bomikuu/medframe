"use client";

import { useRef, useState } from "react";
import {
  Maximize2,
  Wifi,
  LoaderCircle,
  Users,
  ShieldCheck,
  MicOff,
  Minimize2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CallMedia } from "./use-call-media";
import type { CallState } from "./client";

export function CallStage({
  state,
  media,
  fit = false,
  compact = false,
}: {
  state: CallState;
  media: CallMedia;
  fit?: boolean;
  compact?: boolean;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const [fullscreenError, setFullscreenError] = useState("");
  const [previewSize, setPreviewSize] = useState<"small" | "large" | "hidden">("small");
  const remoteName =
    state.role === "doctor" ? (state.patient ?? "Patient") : (state.doctor ?? "Doctor");
  const connected = media.phase === "connected";
  const status =
    media.phase === "reconnecting"
      ? "Reconnecting"
      : media.phase === "connecting"
        ? "Connecting"
        : connected
          ? "Connected"
          : media.phase === "preview"
            ? "Preview only"
            : media.phase === "disconnected"
              ? "Disconnected"
              : "Not connected";
  const initials = remoteName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <div
      ref={surface}
      className={cn(
        "relative flex min-w-0 flex-col overflow-hidden rounded-xl bg-slate-950 text-white [&:fullscreen]:h-dvh [&:fullscreen]:rounded-none",
        fit ? "h-full min-h-0 w-full flex-1" : "min-h-[390px] sm:min-h-[56dvh]",
      )}
      aria-label="Appointment video stage"
    >
      <div
        className="absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-contain!"
        ref={media.remote}
      />
      <div
        className={
          compact ? "hidden" : "relative z-10 flex flex-wrap items-start justify-between gap-3 p-4"
        }
      >
        <span
          className={cn(
            "flex items-center gap-2 rounded-full bg-slate-900/95 px-3 py-2 text-xs text-slate-200",
            fit && "invisible",
            connected && "text-teal-200",
          )}
          role={fit ? undefined : "status"}
          aria-hidden={fit || undefined}
        >
          {["connecting", "reconnecting"].includes(media.phase) ? (
            <LoaderCircle
              aria-hidden
              className="size-3.5 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <Wifi aria-hidden className="size-3.5" />
          )}
          {status}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle video fullscreen"
          className="bg-slate-900/95 text-white hover:bg-slate-700 hover:text-white"
          onClick={async () => {
            setFullscreenError("");
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else if (surface.current?.requestFullscreen)
                await surface.current.requestFullscreen();
              else setFullscreenError("Fullscreen is unavailable in this browser.");
            } catch {
              setFullscreenError("Fullscreen could not open. You can continue in this window.");
            }
          }}
        >
          <Maximize2 aria-hidden className="size-4" />
        </Button>
      </div>
      {compact && !media.hasRemoteVideo && (
        <div className="absolute inset-0 grid place-content-center pb-8 text-center text-sm text-slate-300">
          <span className="mx-auto grid size-9 place-items-center rounded-full bg-slate-800 font-semibold">
            {initials}
          </span>
        </div>
      )}
      {!media.hasRemoteVideo && (
        <div
          className={cn(
            "relative flex min-h-0 flex-1 flex-col items-center justify-center px-5 text-center",
            fit ? "pb-28 sm:pb-20" : "pt-6 pb-40 sm:pb-36",
            compact && "hidden",
          )}
        >
          <span className="mb-3 grid size-14 shrink-0 place-items-center rounded-full border border-slate-700 bg-slate-800 text-xl font-semibold text-slate-200 sm:size-20 sm:text-2xl">
            {initials || <Users aria-hidden className="size-8" />}
          </span>
          <h2 className="max-w-md text-xl font-semibold wrap-anywhere">
            {!state.started
              ? state.role === "doctor"
                ? `Waiting for ${remoteName}`
                : "Waiting for your doctor"
              : connected && media.remotePresent
                ? remoteName
                : connected
                  ? `Waiting for ${state.role === "doctor" ? "your patient" : "the doctor"}`
                  : "Join when you’re ready"}
          </h2>
          <p className="mt-2 max-w-sm text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">
            {!state.started
              ? state.role === "doctor"
                ? state.patient_waiting
                  ? "Your patient has entered. Check your devices, then start the appointment at its scheduled time."
                  : "Check your devices while you wait for your patient. Messages and files are available."
                : state.admitted === false
                  ? "Check your camera and microphone while you wait. Room conversation opens after your doctor admits you."
                  : "Your doctor will start the appointment. You can check your camera or send a message while you wait."
              : connected && media.remotePresent
                ? "Their camera is off. Audio and chat remain available."
                : connected
                  ? "You’re connected to the room. The other participant’s video will appear here when available."
                  : "Check your camera and microphone first, or join using audio only."}
          </p>
        </div>
      )}
      <div
        className={cn(
          compact && "hidden",
          "absolute right-3 bottom-14 z-10 overflow-hidden rounded-lg border border-slate-600 bg-slate-800 shadow-lg",
          previewSize === "large"
            ? "h-40 w-56 max-w-[70%] sm:h-48 sm:w-72"
            : previewSize === "hidden"
              ? "h-9 w-36"
              : "h-24 w-32 sm:h-32 sm:w-44",
        )}
        aria-label="Your camera preview"
      >
        <div
          ref={media.local}
          className={cn("h-full w-full", previewSize === "hidden" && "invisible")}
        />
        {previewSize !== "hidden" && (!media.camera || !media.hasLocalVideo) && (
          <div className="absolute inset-0 grid place-content-center gap-1 bg-slate-800 pb-9 text-center text-xs text-slate-300">
            <span className="mx-auto grid size-8 place-items-center rounded-full bg-slate-700 font-semibold">
              {(state.role === "doctor" ? state.doctor : state.patient)
                ?.split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join("") || "You"}
            </span>
            <span>{media.camera ? "Preview not started" : "Camera off"}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex h-9 items-center justify-between bg-slate-950/90 pl-2 text-[11px]">
          <span className="flex items-center gap-1">
            You {!media.microphone && <MicOff aria-label="Microphone off" className="size-3" />}
          </span>
          <div className="flex">
            {previewSize !== "hidden" && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-9 text-white hover:bg-slate-700 hover:text-white"
                aria-label={previewSize === "large" ? "Shrink preview" : "Expand preview"}
                onClick={() => setPreviewSize(previewSize === "large" ? "small" : "large")}
              >
                {previewSize === "large" ? (
                  <Minimize2 aria-hidden className="size-3" />
                ) : (
                  <Maximize2 aria-hidden className="size-3" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-9 text-white hover:bg-slate-700 hover:text-white"
              aria-label={
                previewSize === "hidden" ? "Show camera preview" : "Minimize camera preview"
              }
              onClick={() => setPreviewSize(previewSize === "hidden" ? "small" : "hidden")}
            >
              {previewSize === "hidden" ? (
                <ChevronUp aria-hidden className="size-3" />
              ) : (
                <ChevronDown aria-hidden className="size-3" />
              )}
            </Button>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10 flex min-h-12 items-center justify-between gap-3 bg-slate-900/95 px-4 py-3 text-xs">
        <span className="min-w-0 truncate font-medium">
          {remoteName}{" "}
          <span className="font-normal text-slate-400">
            · {state.role === "doctor" ? "Patient" : "Doctor"}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-slate-300">
          <ShieldCheck aria-hidden className="size-3.5" />
          Appointment room
        </span>
      </div>
      {fullscreenError && (
        <p
          role="status"
          className="absolute top-16 right-4 left-4 z-20 rounded-lg bg-slate-800 p-3 text-xs"
        >
          {fullscreenError}
        </p>
      )}
      <div ref={media.audio} className="hidden" />
    </div>
  );
}
