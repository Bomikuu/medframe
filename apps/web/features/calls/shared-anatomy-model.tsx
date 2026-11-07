"use client";

import { useRef } from "react";
import { AnatomyViewport } from "@/features/anatomy/anatomy-viewport";
import { AnatomyMap } from "@/features/anatomy/anatomy-map";
import type { AnatomyCamera, AnatomyFinding } from "@/features/anatomy/schema";
import type { ModelPresentation } from "./use-model-presentation";
const NO_FINDINGS: AnatomyFinding[] = [];

export default function SharedAnatomyModel({
  share,
  doctor,
  onUnavailable,
}: {
  share: ModelPresentation;
  doctor: boolean;
  onUnavailable: () => void;
}) {
  const state = share.presentation!;
  const initialScene = useRef(state.scene_revision);
  const resumed = useRef(!!share.cameraSource.current);
  const view = state.scene.view as AnatomyCamera;
  return (
    <AnatomyViewport
      layer={state.model === "skeleton" ? "skeleton" : "body"}
      selected={state.doctor_focus?.id ?? ""}
      focus={state.doctor_focus?.id}
      isolate={state.scene.isolate}
      findings={NO_FINDINGS}
      patientPointer={state.patient_pointer?.id}
      view={view}
      reset={state.scene_revision}
      onFailure={onUnavailable}
      fallback={
        <div className="flex h-full min-h-0 flex-col">
          <p role="status" className="p-3 text-sm">
            3D is unavailable. Use the named parts list; this map is a reference.
          </p>
          <AnatomyMap view={view} enabled={false} />
        </div>
      }
      sharing={{
        controlled: doctor && share.connection === "ready",
        preservePose: resumed.current && initialScene.current === state.scene_revision,
        source: share.cameraSource,
        onPose: share.setCamera,
      }}
      onSelect={(id) => {
        if (!share.canSelect) return;
        if (doctor) share.setFocus({ id, surface: null });
        else share.point({ id, surface: null });
      }}
    />
  );
}
