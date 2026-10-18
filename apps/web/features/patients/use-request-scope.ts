"use client";

import { useCallback, useEffect, useRef } from "react";

/** Capture an activation per request: Activity can hide and later restore the same component. */
export function useRequestScope() {
  const generation = useRef(0);
  useEffect(() => {
    generation.current += 1;
    return () => {
      generation.current += 1;
    };
  }, []);
  return useCallback(() => {
    const activation = generation.current;
    return () => generation.current === activation;
  }, []);
}
