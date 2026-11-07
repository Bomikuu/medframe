"use client";

import { useEffect, useRef } from "react";

export function useStepFocus(step: string | number, headingId: string) {
  const previous = useRef(step);
  useEffect(() => {
    if (previous.current === step) return;
    previous.current = step;
    const heading = document.getElementById(headingId);
    heading?.focus({ preventScroll: true });
  }, [step, headingId]);
}

export function useReturnFocus() {
  const opener = useRef(typeof document === "undefined" ? null : document.activeElement);
  useEffect(() => {
    return () => {
      const target = opener.current;
      if (target instanceof HTMLElement && target.isConnected)
        target.focus({ preventScroll: true });
    };
  }, []);
}
