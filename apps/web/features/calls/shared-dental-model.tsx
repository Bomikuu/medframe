"use client";

import { useMemo, useRef } from "react";
import Dental3D from "@/features/dental/dental-3d";
import { useDentalViewport } from "@/features/dental/use-dental-viewport";
import type { DentalView } from "@/features/dental/anatomy";
import type { Finding } from "@/features/consultations/schema";
import type { ModelPresentation } from "./use-model-presentation";
const NO_FINDINGS: Finding[] = [];

export default function SharedDentalModel({
  share,
  doctor,
}: {
  share: ModelPresentation;
  doctor: boolean;
}) {
  const local = useDentalViewport();
  const state = share.presentation!;
  const initialScene = useRef(state.scene_revision);
  const resumed = useRef(!!share.cameraSource.current);
  const focus = state.doctor_focus;
  const stableFocus = useMemo(
    () => (focus ? { tooth: focus.id, surface: focus.surface } : null),
    [focus?.id, focus?.surface],
  );
  const viewport = {
    ...local,
    jaw: state.scene.jaw,
    view: state.scene.view as DentalView,
    isolate: state.scene.isolate,
    reset: state.scene_revision,
    focus: stableFocus,
    reference: false,
    anatomyOnly: true,
    showLabel: true,
  };
  return (
    <Dental3D
      editor
      dentition="permanent"
      selected={focus?.id ?? ""}
      selectedSurface={focus?.surface ?? null}
      findings={NO_FINDINGS}
      workspace={viewport}
      patientPointer={state.patient_pointer?.id}
      sharing={{
        controlled: doctor && share.connection === "ready",
        preservePose: resumed.current && initialScene.current === state.scene_revision,
        source: share.cameraSource,
        onPose: share.setCamera,
      }}
      onSelect={(id, surface) => {
        if (!share.canSelect) return;
        const part = { id, surface: surface ?? null };
        if (doctor) share.setFocus(part);
        else share.point(part);
      }}
    />
  );
}
