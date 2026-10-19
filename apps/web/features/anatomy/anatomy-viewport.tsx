"use client";
import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { SceneProps } from "./anatomy-scene";
import type { AnatomyCamera } from "./schema";
const Scene = dynamic(() => import("./anatomy-scene"), {
  ssr: false,
  loading: () => <p className="p-5 text-sm">Preparing 3D workspace…</p>,
});
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export function AnatomyViewport(
  props: SceneProps & {
    view: AnatomyCamera;
    reset: number;
    zoom?: number;
    onFailure: () => void;
    fallback: ReactNode;
  },
) {
  return (
    <SceneBoundary fallback={props.fallback} onFailure={props.onFailure}>
      <Scene {...props} />
    </SceneBoundary>
  );
}
