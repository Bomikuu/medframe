"use client";

import { Component, Suspense, useCallback, useId, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsInstance } from "three-stdlib";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/features/patients/form-controls";
import type { Finding } from "@/features/consultations/schema";
import type { AnnotationInteraction } from "./annotation-pins";
import { MousePointer2, MessageSquare } from "@/components/icons";
import { AnatomicalScene } from "./anatomical-scene";
import {
  MOLAR_REFERENCE_MODEL,
  PERMANENT_MODEL,
  VIEW_OPTIONS,
  toothPresentation,
  type DentalView,
  type JawView,
} from "./anatomy";

class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="status" className="rounded-lg border border-border p-6 text-sm">
        The anatomical model could not load. Open the 2D tooth selector to continue charting.
      </p>
    ) : (
      this.props.children
    );
  }
}

export default function Dental3D({
  selected,
  onSelect,
  findings,
  dentition,
  editor = false,
  annotations,
}: {
  editor?: boolean;
  annotations?: AnnotationInteraction;
  selected: string;
  onSelect: (id: string, surface?: string) => void;
  selectedSurface: string | null;
  findings: Finding[];
  dentition: "permanent" | "primary";
}) {
  const cameraId = useId();
  const [jaw, setJaw] = useState<JawView>("both");
  const [isolate, setIsolate] = useState(false);
  const [view, setView] = useState<DentalView>("front");
  const [reset, setReset] = useState(0);
  const [anatomyOnly, setAnatomyOnly] = useState(false);
  const [reference, setReference] = useState(false);
  const [readyUrl, setReadyUrl] = useState<string | null>(null);
  const controls = useRef<OrbitControlsInstance | null>(null);
  const focused = findings.find((finding) => finding.key === annotations?.activeKey)?.anchor;
  const detailed =
    selected === "26" && (focused ? focused.asset === "dundee-molar26-v1" : reference);
  const modelUrl = detailed ? MOLAR_REFERENCE_MODEL : PERMANENT_MODEL;
  const ready = readyUrl === modelUrl;
  const markReady = useCallback(() => setReadyUrl(modelUrl), [modelUrl]);
  const condition = toothPresentation(findings, selected);
  if (dentition === "primary")
    return (
      <p className="rounded-lg border border-border p-5 text-sm leading-6">
        Primary anatomy is not installed. Use the 20-tooth 2D chart; permanent teeth are never
        resized to represent primary teeth.
      </p>
    );
  function changeView(next: DentalView) {
    setView(next);
    if (next === "upper" || next === "lower") setJaw(next);
    setReset((value) => value + 1);
  }
  return (
    <ModelBoundary>
      <div className={editor ? "flex h-full min-h-0 min-w-0 flex-col gap-3" : "grid min-w-0 gap-4"}>
        {annotations && (
          <div
            className="flex flex-wrap items-center gap-2 border-b border-border pb-3"
            role="toolbar"
            aria-label="Dental tools"
          >
            <Button
              type="button"
              variant={annotations.tool === "select" ? "secondary" : "ghost"}
              aria-pressed={annotations.tool === "select"}
              onClick={() => annotations.onToolChange("select")}
            >
              <MousePointer2 />
              Select
            </Button>
            <Button
              type="button"
              variant={annotations.tool === "comment" ? "secondary" : "ghost"}
              disabled={!annotations.canComment}
              aria-pressed={annotations.tool === "comment"}
              onClick={() => annotations.onToolChange("comment")}
            >
              <MessageSquare />
              Comment
            </Button>
            <span className="text-xs text-muted-foreground">
              {annotations.tool === "comment"
                ? "Click a point on a tooth to place a note. Drag to rotate."
                : "Select a tooth or drag to rotate. Isolate to inspect its sides."}
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Visible jaws">
            {(
              [
                ["both", "Both jaws"],
                ["upper", "Upper jaw"],
                ["lower", "Lower jaw"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant={jaw === value && !reference ? "secondary" : "outline"}
                aria-pressed={jaw === value && !reference}
                onClick={() => {
                  setJaw(value);
                  setReference(false);
                  annotations?.onOpen(null);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="w-full min-[480px]:w-44">
            <FormSelect
              id={`dental-camera-${cameraId}`}
              label="Camera view"
              value={view}
              onChange={(value) => changeView(value as DentalView)}
              options={VIEW_OPTIONS}
            />
          </div>
        </div>
        <div
          className={
            editor
              ? `relative min-h-[260px] flex-1 overflow-hidden rounded-lg border border-border bg-muted/40 ${annotations?.tool === "comment" ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`
              : "relative h-[360px] min-w-0 overflow-hidden rounded-lg border border-border bg-muted/40 sm:h-[480px]"
          }
          aria-label="Interactive anatomical dental model"
        >
          {!ready && (
            <p
              role="status"
              className="absolute inset-x-0 top-4 z-10 text-center text-sm text-muted-foreground"
            >
              Loading anatomical model…
            </p>
          )}
          <Canvas
            camera={{ position: [0, 1, 6], fov: 35 }}
            frameloop="demand"
            dpr={[1, 1.5]}
            gl={{ antialias: true }}
          >
            <hemisphereLight args={["#ffffff", "#a7adb5", 2]} />
            <directionalLight position={[3, 5, 5]} intensity={2.5} />
            <directionalLight position={[-3, -3, -3]} intensity={1.2} />
            <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.12} />
            <Suspense fallback={null}>
              <AnatomicalScene
                key={modelUrl}
                url={modelUrl}
                selected={selected}
                onSelect={onSelect}
                findings={findings}
                jaw={jaw}
                isolate={isolate}
                view={view}
                reset={reset}
                anatomyOnly={anatomyOnly}
                reference={detailed}
                controls={controls}
                onReady={markReady}
                annotations={annotations}
              />
            </Suspense>
          </Canvas>
          <div className="pointer-events-none absolute right-3 bottom-3 left-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {detailed
                ? "Detailed upper-left first molar · FDI 26"
                : view === "front"
                  ? "Patient right ← Front view → Patient left"
                  : VIEW_OPTIONS.find((option) => option.value === view)?.label}
            </span>
            <span>{ready ? "Anatomical model ready" : ""}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            aria-pressed={isolate}
            disabled={reference}
            onClick={() => setIsolate(!isolate)}
          >
            Isolate selected tooth
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setJaw("both");
              setIsolate(false);
              setView("front");
              setReset((value) => value + 1);
              setReference(false);
              annotations?.onOpen(null);
            }}
          >
            Reset camera
          </Button>
          <Button
            type="button"
            variant={anatomyOnly ? "secondary" : "outline"}
            aria-pressed={anatomyOnly}
            onClick={() => setAnatomyOnly(!anatomyOnly)}
          >
            Reference anatomy {anatomyOnly ? "on" : "off"}
          </Button>
          {selected === "26" && (
            <Button
              type="button"
              variant={reference ? "secondary" : "outline"}
              aria-pressed={reference}
              onClick={() => {
                annotations?.onOpen(null);
                setReference(!reference);
                setIsolate(false);
                setView("front");
                setReset((value) => value + 1);
              }}
            >
              Detailed tooth 26
            </Button>
          )}
        </div>
        {condition.missing && !anatomyOnly && (
          <p role="status" className="text-sm leading-6">
            Tooth {selected} is recorded missing and its mesh is hidden. Use the 2D selector to
            select it, or enable reference anatomy for an educational view.
          </p>
        )}
        {anatomyOnly && (
          <p role="status" className="text-sm font-medium">
            Educational reference anatomy. Recorded findings have not changed.
          </p>
        )}
        <p className={editor ? "sr-only" : "text-xs leading-5 text-muted-foreground"}>
          Select a tooth, drag to rotate, scroll to zoom or right-drag to pan. Highlights identify
          whole-tooth records; select clinical surfaces in the tooth panel. No finding does not
          establish a healthy tooth.
        </p>
        <details className="text-xs leading-5 text-muted-foreground">
          <summary className="cursor-pointer">Model source & reference limits</summary>
          <p className="mt-2">
            Anatomical reference, not patient-specific or dimensionally calibrated. Models by{" "}
            <a
              href="https://sketchfab.com/DundeeDental"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              University of Dundee, School of Dentistry
            </a>
            ,{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              CC BY 4.0
            </a>
            . Textures optimized and FDI metadata added; no tooth geometry reshaped.{" "}
            <a
              href={
                detailed
                  ? "https://sketchfab.com/3d-models/maxillary-first-molar-e719a474ef7e4bd7abec508f85f1e984"
                  : "https://sketchfab.com/3d-models/permanent-dentition-2f69d7b59c3e4a6a8bcae041bd8e591b"
              }
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              Original asset
            </a>
            .
          </p>
        </details>
      </div>
    </ModelBoundary>
  );
}
