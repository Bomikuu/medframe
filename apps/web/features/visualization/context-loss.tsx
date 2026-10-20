"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/** Renderer failure changes the view only; clinical form state stays with its owner. */
export function ContextLoss({ onFailure }: { onFailure: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    gl.domElement.addEventListener("webglcontextlost", lost, { once: true });
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onFailure]);
  return null;
}
