"use client";

import { ModelParticipationStatus } from "./model-participation-status";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, Eye, List, MousePointer2, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ModelPartsSheet, modelPartLabel } from "./model-parts-sheet";
import { PRESENTATION_ASSETS } from "./presentation-types";
import type { ModelPresentation } from "./use-model-presentation";

const Dental = dynamic(() => import("./shared-dental-model"), {
  ssr: false,
  loading: () => (
    <p role="status" className="p-5 text-sm">
      Preparing dental model…
    </p>
  ),
});
const Anatomy = dynamic(() => import("./shared-anatomy-model"), {
  ssr: false,
  loading: () => (
    <p role="status" className="p-5 text-sm">
      Preparing anatomy model…
    </p>
  ),
});
export function ModelPresentationStage({
  share,
  doctor,
}: {
  share: ModelPresentation;
  doctor: boolean;
}) {
  const [partsOpen, setPartsOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const failed = useCallback(() => setUnavailable(true), []);
  const state = share.presentation!;
  if (!state.model) return null;
  const dental = state.model === "dental";
  const valid = state.asset_version === PRESENTATION_ASSETS[state.model];
  const views = dental
    ? (["front", "upper", "lower", "left", "right"] as const)
    : (["front", "back", "left", "right"] as const);
  const ready = share.connection === "ready";
  return (
    <section
      className="absolute inset-2 flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background sm:inset-3"
      aria-label="Shared interactive model"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card p-2 sm:px-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">
            {dental ? "Dental model" : state.model === "body" ? "Body anatomy" : "Skeleton"}
          </h2>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {!ready ? (
              "Reconnecting. Model interaction is paused."
            ) : doctor ? (
              "You control the shared view"
            ) : share.canSelect ? (
              <>
                <MousePointer2 aria-hidden className="size-3" />
                Selection enabled
              </>
            ) : (
              <>
                <Eye aria-hidden className="size-3" />
                View only
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setPartsOpen(true)}>
            <List aria-hidden className="size-4" />
            Parts
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Model presentation options">
                <ChevronDown aria-hidden className="size-4" />
                Options
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="grid w-72 gap-4">
              {doctor ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="patient-model-selection" className="text-sm font-medium">
                      Allow patient selection
                    </label>
                    <Switch
                      id="patient-model-selection"
                      checked={state.allow_patient_selection}
                      disabled={!ready}
                      onCheckedChange={share.setSelectionPermission}
                    />
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Patient pointers are temporary. They don’t edit the clinical record.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {views.map((view) => (
                      <Button
                        key={view}
                        size="sm"
                        variant={state.scene.view === view ? "secondary" : "outline"}
                        disabled={!ready}
                        onClick={() =>
                          share.setFocus(null, {
                            view,
                            jaw: view === "upper" || view === "lower" ? view : "both",
                            isolate: false,
                          })
                        }
                        className="capitalize"
                      >
                        {view}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    disabled={!ready || !state.doctor_focus}
                    onClick={() =>
                      share.setFocus(state.doctor_focus, { isolate: !state.scene.isolate })
                    }
                  >
                    {state.scene.isolate ? "Show all parts" : "Isolate selected part"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!ready}
                    onClick={() =>
                      share.setFocus(null, { view: "front", jaw: "both", isolate: false })
                    }
                  >
                    <RotateCcw aria-hidden className="size-4" />
                    Reset view
                  </Button>
                  <Button variant="secondary" disabled={!ready} onClick={share.stop}>
                    <Square aria-hidden className="size-4" />
                    Stop presenting
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="patient-view-only" className="text-sm font-medium">
                      View only for me
                    </label>
                    <Switch
                      id="patient-view-only"
                      checked={share.localViewOnly || !state.allow_patient_selection}
                      disabled={!state.allow_patient_selection}
                      onCheckedChange={share.setLocalViewOnly}
                    />
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Your doctor controls rotation and zoom. When selection is enabled, you can point
                    to a part using the model or Parts list.
                  </p>
                  {state.patient_pointer && (
                    <Button
                      variant="outline"
                      disabled={!share.canSelect}
                      onClick={share.clearPointer}
                    >
                      Clear my pointer
                    </Button>
                  )}
                </>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <ModelParticipationStatus share={share} doctor={doctor} />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {valid ? (
          dental ? (
            <Dental share={share} doctor={doctor} />
          ) : (
            <Anatomy share={share} doctor={doctor} onUnavailable={failed} />
          )
        ) : (
          <div role="status" className="p-5 text-sm">
            This model version is unavailable. Ask your doctor to start a new presentation.
          </div>
        )}
        {!valid || unavailable ? (
          <p className="absolute right-3 bottom-3 left-3 rounded-lg border border-border bg-card p-3 text-xs">
            Use Parts for the labeled selection alternative.
          </p>
        ) : null}
        {!ready && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-background/80 p-5 text-center text-sm">
            The last view is paused while model sharing reconnects. Video and chat can continue.
          </div>
        )}
      </div>
      <div className="grid shrink-0 gap-1 border-t border-border bg-card p-2 text-xs sm:px-3">
        <p className="truncate text-teal-ink">
          <strong>Doctor focus:</strong> {modelPartLabel(state.doctor_focus, dental)}
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-amber-800 dark:text-amber-300">
            <strong>Patient pointer:</strong> {modelPartLabel(state.patient_pointer, dental)}
          </p>
          {doctor && state.patient_pointer && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 text-xs"
              disabled={!ready}
              onClick={() => share.setFocus(state.patient_pointer)}
            >
              Focus here
            </Button>
          )}
        </div>
      </div>
      <ModelPartsSheet
        open={partsOpen}
        close={() => setPartsOpen(false)}
        share={share}
        doctor={doctor}
      />
    </section>
  );
}
