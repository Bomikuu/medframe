"use client";

import { useCallback, useState } from "react";
import type { DentalView, JawView } from "./anatomy";
import type { ToothFocus } from "./camera-focus";

export function useDentalViewport(initialFocus: ToothFocus | null = null) {
  const [jaw, setJaw] = useState<JawView>("both");
  const [view, setView] = useState<DentalView>("front");
  const [isolate, setIsolate] = useState(false);
  const [reference, setReference] = useState(false);
  const [anatomyOnly, setAnatomyOnly] = useState(false);
  const [showLabel, setShowLabel] = useState(true);
  const [expandedCanvas, setExpandedCanvas] = useState(false);
  const [navigation, setNavigation] = useState<"rotate" | "zoom" | "pan">("rotate");
  const [reset, setReset] = useState(0);
  const [focus, setFocus] = useState<ToothFocus | null>(initialFocus);
  const focusTooth = useCallback((tooth: string, surface: string | null = null) => {
    const upper = Number(tooth[0]) <= 2;
    const occlusal = surface === "occlusal" || surface === "incisal";
    setFocus({ tooth, surface });
    setJaw(occlusal ? (upper ? "upper" : "lower") : "both");
    setReference(false);
    setReset((value) => value + 1);
  }, []);
  function chooseView(next: DentalView) {
    setFocus(null);
    setView(next);
    setJaw(next === "upper" || next === "lower" ? next : "both");
    setIsolate(false);
    setReference(false);
    setReset((value) => value + 1);
  }
  function resetCamera() {
    setFocus(null);
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
    focus,
    setFocus,
    focusTooth,
  };
}
export type DentalViewport = ReturnType<typeof useDentalViewport>;
