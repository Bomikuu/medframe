"use client";

import { Button } from "@/components/ui/button";
import type { ModelPresentation } from "./use-model-presentation";
export function ModelPresentationNotice({
  share,
  doctor,
}: {
  share: ModelPresentation;
  doctor: boolean;
}) {
  const text = share.error || share.notice;
  return (
    <div
      className={
        text ? "shrink-0 border-b border-border bg-card px-3 py-2 text-xs sm:px-5" : "sr-only"
      }
      role={share.error ? "alert" : "status"}
      aria-live={share.error ? "assertive" : "polite"}
      aria-atomic="true"
    >
      {text && (
        <div className="flex items-center justify-between gap-3">
          <p className={share.error ? "text-destructive" : "text-muted-foreground"}>
            {doctor
              ? text
                  .replace("Your doctor is presenting", "You’re presenting")
                  .replace(
                    "Your doctor enabled selection. Choose a tooth or body part to point it out.",
                    "Patient selection is enabled. Their pointer will appear on the model.",
                  )
                  .replace(
                    "Selection is off. You can keep following your doctor’s view.",
                    "Patient selection is off. The patient can keep following your view.",
                  )
              : text}
          </p>
          {!doctor && share.presentation?.allow_patient_selection && !share.localViewOnly && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => share.setLocalViewOnly(true)}
            >
              View only
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
