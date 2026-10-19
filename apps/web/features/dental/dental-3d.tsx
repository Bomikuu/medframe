"use client";

import { Component, Suspense, useCallback, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { MOUSE } from "three";
import type { OrbitControls as OrbitControlsInstance } from "three-stdlib";
import { Button } from "@/components/ui/button";
import type { Finding } from "@/features/consultations/schema";
import type { AnnotationInteraction } from "./annotation-pins";
import { AnatomicalScene } from "./anatomical-scene";
import { CanvasToolbar, CanvasNavigation } from "./canvas-tools";
import { ViewPreviews } from "./view-previews";
import { useDentalViewport, type DentalViewport } from "./use-dental-viewport";
import { MOLAR_REFERENCE_MODEL, PERMANENT_MODEL, VIEW_OPTIONS, toothPresentation } from "./anatomy";

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
  selectedSurface,
  onSelect,
  findings,
  dentition,
  editor = false,
  annotations,
  workspace,
  onAnnotate,
}: {
  editor?: boolean;
  annotations?: AnnotationInteraction;
  workspace?: DentalViewport;
  onAnnotate?: () => void;
  selected: string;
  onSelect: (id: string, surface?: string) => void;
  selectedSurface: string | null;
  findings: Finding[];
  dentition: "permanent" | "primary";
}) {
  const localViewport = useDentalViewport();
  const viewport = workspace ?? localViewport;
  const [readyUrl, setReadyUrl] = useState<string | null>(null);
  const controls = useRef<OrbitControlsInstance | null>(null);
  const focused = findings.find((finding) => finding.key === annotations?.activeKey)?.anchor;
  const detailed =
    selected === "26" && (focused ? focused.asset === "dundee-molar26-v1" : viewport.reference);
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
  function resetCamera() {
    viewport.resetCamera();
    annotations?.onOpen(null);
  }
  return (
    <ModelBoundary>
      <div className={editor ? "flex h-full min-h-0 min-w-0 flex-col gap-3" : "grid min-w-0 gap-4"}>
        <div role="status" className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md bg-cyan-800 px-3 py-2 font-semibold text-white">
            Selected · {selected}
            {selectedSurface ? ` · ${selectedSurface}` : " · whole tooth"}
          </span>
          {condition.impaction && <span>Impaction · {condition.impaction}</span>}
          {condition.crown && !condition.missing && !viewport.anatomyOnly && (
            <span className="rounded-md border border-amber-700 bg-amber-100 px-2 py-1 font-semibold text-amber-950">
              Gold overlay · crown present
            </span>
          )}
          {condition.bracket && <span>Bracket present</span>}
        </div>
        <CanvasToolbar viewport={viewport} annotations={annotations} onAnnotate={onAnnotate} />
        <div
          aria-label="Interactive anatomical dental model"
          className={`${editor ? "h-[48dvh] min-h-[300px] shrink-0 lg:h-auto lg:min-h-[320px] lg:flex-1" : viewport.expandedCanvas ? "h-[70dvh]" : "h-[360px] sm:h-[480px]"} relative isolate min-w-0 overflow-hidden rounded-xl bg-muted/30 ${annotations?.tool === "comment" ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
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
            onCreated={({ gl }) => {
              gl.localClippingEnabled = true;
            }}
            camera={{ position: [0, 1, 6], fov: 35 }}
            frameloop="demand"
            dpr={[1, 1.5]}
            gl={{ antialias: true }}
          >
            <hemisphereLight args={["#ffffff", "#a7adb5", 2]} />
            <directionalLight position={[3, 5, 5]} intensity={2.5} />
            <directionalLight position={[-3, -3, -3]} intensity={1.2} />
            <OrbitControls
              ref={controls}
              makeDefault
              enableDamping
              dampingFactor={0.12}
              mouseButtons={{
                LEFT:
                  viewport.navigation === "pan"
                    ? MOUSE.PAN
                    : viewport.navigation === "zoom"
                      ? MOUSE.DOLLY
                      : MOUSE.ROTATE,
                MIDDLE: MOUSE.DOLLY,
                RIGHT: MOUSE.PAN,
              }}
            />
            <Suspense fallback={null}>
              <AnatomicalScene
                key={modelUrl}
                url={modelUrl}
                selected={selected}
                selectedSurface={selectedSurface}
                onSelect={onSelect}
                findings={findings}
                jaw={viewport.jaw}
                isolate={viewport.isolate}
                view={viewport.view}
                reset={viewport.reset}
                focus={viewport.focus}
                anatomyOnly={viewport.anatomyOnly}
                reference={detailed}
                controls={controls}
                onReady={markReady}
                annotations={annotations}
                showLabel={viewport.showLabel}
              />
            </Suspense>
          </Canvas>
          <CanvasNavigation viewport={viewport} onReset={resetCamera} />
          <div className="pointer-events-none absolute right-3 bottom-3 left-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span role="status">
              {viewport.focus
                ? `Focused on tooth ${viewport.focus.tooth}${viewport.focus.surface ? ` · ${viewport.focus.surface}` : ""}`
                : detailed
                  ? "Detailed upper-left first molar · FDI 26"
                  : viewport.view === "front"
                    ? "Patient right ← Front view → Patient left"
                    : VIEW_OPTIONS.find((option) => option.value === viewport.view)?.label}
            </span>
            <span>{ready ? "Anatomical model ready" : ""}</span>
          </div>
        </div>
        {
          <ViewPreviews
            viewport={viewport}
            selected={selected}
            onChoose={() => annotations?.onOpen(null)}
          />
        }
        {condition.missing && !viewport.anatomyOnly && (
          <p role="status" className="text-xs leading-5">
            Tooth {selected} is recorded missing. The red reference tooth marks its position; it
            does not represent a present tooth.
          </p>
        )}
        {viewport.anatomyOnly && (
          <p role="status" className="text-xs font-medium">
            Educational reference anatomy. Recorded findings have not changed.
          </p>
        )}
        <details className="shrink-0 text-xs leading-5 text-muted-foreground">
          <summary className="cursor-pointer">Model source & view options</summary>
          <div className="my-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              aria-pressed={viewport.anatomyOnly}
              onClick={() => viewport.setAnatomyOnly(!viewport.anatomyOnly)}
            >
              Reference anatomy {viewport.anatomyOnly ? "on" : "off"}
            </Button>
            {selected === "26" && (
              <Button
                type="button"
                variant="outline"
                aria-pressed={detailed}
                onClick={() => {
                  annotations?.onOpen(null);
                  viewport.setReference(!viewport.reference);
                  viewport.setIsolate(false);
                  viewport.setView("front");
                  viewport.setReset((value) => value + 1);
                }}
              >
                Detailed tooth 26
              </Button>
            )}
          </div>
          <p>
            Drag to rotate, use the wheel to zoom or right-drag to pan. Point notes are visual
            anchors; clinical surface labels are assigned manually. This reference is not
            patient-specific or dimensionally calibrated; measurement is unavailable.
          </p>
          <p className="mt-2">
            Models by{" "}
            <a
              className="underline underline-offset-4"
              href="https://sketchfab.com/DundeeDental"
              target="_blank"
              rel="noreferrer"
            >
              University of Dundee, School of Dentistry
            </a>
            ,{" "}
            <a
              className="underline underline-offset-4"
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY 4.0
            </a>
            . Textures optimized, FDI metadata and PNG previews added; no tooth geometry reshaped.{" "}
            <a
              className="underline underline-offset-4"
              href={
                detailed
                  ? "https://sketchfab.com/3d-models/maxillary-first-molar-e719a474ef7e4bd7abec508f85f1e984"
                  : "https://sketchfab.com/3d-models/permanent-dentition-2f69d7b59c3e4a6a8bcae041bd8e591b"
              }
              target="_blank"
              rel="noreferrer"
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
