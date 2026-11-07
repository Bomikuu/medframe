"use client";

import { Eye, MousePointer2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ModelPresentation } from "./use-model-presentation";

export function ModelParticipationStatus({
  share,
  doctor,
}: {
  share: ModelPresentation;
  doctor: boolean;
}) {
  const state = share.presentation;
  if (!state?.active) return null;
  const ready = share.connection === "ready";
  const enabled = ready && state.allow_patient_selection;
  const Icon = !ready
    ? WifiOff
    : doctor
      ? enabled
        ? MousePointer2
        : Eye
      : share.canSelect
        ? MousePointer2
        : Eye;
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 text-xs">
      <div className="flex min-w-0 items-start gap-2">
        <Icon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-teal-ink" />
        <div>
          <p role="status" aria-live="polite" className="font-medium">
            {!ready
              ? "Shared model reconnecting · interaction paused"
              : doctor
                ? enabled
                  ? "Patient can point to parts"
                  : "Patient is viewing only"
                : share.canSelect
                  ? "You can point to a part for your doctor"
                  : "You are viewing your doctor’s model"}
          </p>
          <p className="mt-0.5 text-muted-foreground">
            {doctor
              ? "Your view is shared. Patient pointers are temporary and do not enter the chart."
              : "Your doctor controls rotation and zoom. Pointing does not change your medical record."}
          </p>
        </div>
      </div>
      {doctor ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!ready}
          onClick={() => share.setSelectionPermission(!state.allow_patient_selection)}
        >
          {enabled ? "Pause patient selection" : "Enable patient selection"}
        </Button>
      ) : (
        enabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => share.setLocalViewOnly(!share.localViewOnly)}
          >
            {share.localViewOnly ? "Let me point to parts" : "View only for me"}
          </Button>
        )
      )}
    </div>
  );
}
