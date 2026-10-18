"use client";

import { useState } from "react";
import type { DentalView, JawView } from "./anatomy";

export function useDentalViewport() {
  const [jaw, setJaw] = useState<JawView>("both");
  const [view, setView] = useState<DentalView>("front");
  const [isolate, setIsolate] = useState(false);
  const [reference, setReference] = useState(false);
  const [anatomyOnly, setAnatomyOnly] = useState(false);
  const [showLabel, setShowLabel] = useState(true);
  const [expandedCanvas, setExpandedCanvas] = useState(false);
  const [navigation, setNavigation] = useState<"rotate" | "zoom" | "pan">("rotate");
  const [reset, setReset] = useState(0);
  function chooseView(next: DentalView) {
    setView(next);
    setJaw(next === "upper" || next === "lower" ? next : "both");
    setIsolate(false);
    setReference(false);
    setReset((value) => value + 1);
  }
  function resetCamera() {
    setView("front");
    setJaw("both");
    setIsolate(false);
    setReference(false);
    setReset((value) => value + 1);
  }
  return {
    jaw,
    setJaw,
    view,
    setView,
    isolate,
    setIsolate,
    reference,
    setReference,
    anatomyOnly,
    setAnatomyOnly,
    showLabel,
    setShowLabel,
    expandedCanvas,
    setExpandedCanvas,
    navigation,
    setNavigation,
    reset,
    setReset,
    chooseView,
    resetCamera,
  };
}
export type DentalViewport = ReturnType<typeof useDentalViewport>;
