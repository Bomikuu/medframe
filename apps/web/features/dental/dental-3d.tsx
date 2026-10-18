"use client";

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial } from "three";
import { Button } from "@/components/ui/button";
import type { Finding } from "@/features/consultations/schema";

type Props = {
  selected: string;
  onSelect: (id: string, surface?: string) => void;
  selectedSurface: string | null;
  findings: Finding[];
  dentition: "permanent" | "primary";
};

class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="status" className="p-6 text-sm">
        3D is unavailable on this device. Use the complete 2D chart above.
      </p>
    ) : (
      this.props.children
    );
  }
}

function Teeth({
  selected,
  selectedSurface,
  onSelect,
  findings,
  dentition,
  jaw,
  isolate,
  onReady,
}: Props & { jaw: string; isolate: boolean; onReady: () => void }) {
  const reported = useRef(false);
  useFrame(() => {
    if (!reported.current) {
      reported.current = true;
      onReady();
    }
  });
  const { scene } = useGLTF("/models/dental-schematic-v2.glb");
  const activeKey = findings
    .filter((finding) => finding.status === "active")
    .flatMap((finding) =>
      (finding.surfaces.length ? finding.surfaces : ["*"]).map(
        (surface) => `${finding.tooth}:${surface}`,
      ),
    )
    .sort()
    .join(",");
  const activeSurfaces = useMemo(() => new Set(activeKey.split(",")), [activeKey]);
  const clone = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const id = String(object.userData.tooth_id ?? "");
      const surface = String(object.userData.surface_id ?? "");
      object.visible =
        object.userData.dentition === dentition &&
        (jaw === "both" || object.userData.jaw === jaw) &&
        (!isolate || id === selected);
      // Three's raycaster also intersects invisible meshes. Hidden dentitions
      // and jaws must not intercept a click intended for a visible tooth.
      if (!object.visible) object.raycast = () => {};
      const material = (object.material as MeshStandardMaterial).clone();
      material.color.set(
        id === selected
          ? selectedSurface && selectedSurface !== surface
            ? "#B2CDD9"
            : "#0F2D4A"
          : activeSurfaces.has(`${id}:*`) || activeSurfaces.has(`${id}:${surface}`)
            ? "#B86B17"
            : "#D7E3ED",
      );
      object.material = material;
    });
    return root;
  }, [scene, selected, selectedSurface, activeSurfaces, dentition, jaw, isolate]);
  useEffect(
    () => () => {
      clone.traverse((object) => {
        if (object instanceof Mesh && object.material instanceof MeshStandardMaterial)
          object.material.dispose();
      });
    },
    [clone],
  );
  function select(event: ThreeEvent<MouseEvent>) {
    const id: unknown = event.object.userData.tooth_id;
    if (typeof id === "string") {
      event.stopPropagation();
      const surface: unknown = event.object.userData.surface_id;
      onSelect(id, typeof surface === "string" ? surface : undefined);
    }
  }
  return <primitive object={clone} onClick={select} />;
}

export default function Dental3D(props: Props) {
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);
  const [jaw, setJaw] = useState("both");
  const [isolate, setIsolate] = useState(false);
  const [view, setView] = useState<"front" | "upper">("front");
  const [reset, setReset] = useState(0);
  return (
    <ModelBoundary>
      <div className="my-4 flex flex-wrap gap-2">
        {[
          ["both", "Both jaws"],
          ["upper", "Upper jaw"],
          ["lower", "Lower jaw"],
        ].map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant={jaw === value ? "secondary" : "outline"}
            aria-pressed={jaw === value}
            onClick={() => setJaw(value)}
          >
            {label}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          aria-pressed={isolate}
          onClick={() => setIsolate(!isolate)}
        >
          Isolate selected
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setView(view === "front" ? "upper" : "front");
            setReset((value) => value + 1);
          }}
        >
          Change view
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setJaw("both");
            setIsolate(false);
            setView("front");
            setReset((value) => value + 1);
          }}
        >
          Reset view
        </Button>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Schematic development model. Not anatomically validated or patient-specific. Drag to rotate,
        scroll to zoom, right-drag to pan.
      </p>
      <p role="status" className="mb-3 text-xs text-muted-foreground">
        {ready ? "Schematic model ready" : "Loading schematic model…"}
      </p>
      <div
        className="h-80 overflow-hidden rounded-lg border border-border bg-muted"
        aria-label="Interactive schematic dental model"
      >
        <Canvas
          key={reset}
          camera={{ position: view === "front" ? [0, 5, 13] : [0, 14, 2], fov: 45 }}
          frameloop="demand"
          dpr={[1, 1.5]}
        >
          <ambientLight intensity={1.5} />
          <directionalLight position={[5, 8, 7]} intensity={2} />
          <Suspense fallback={null}>
            <Teeth {...props} jaw={jaw} isolate={isolate} onReady={markReady} />
          </Suspense>
          <OrbitControls makeDefault minDistance={3} maxDistance={25} enableDamping={false} />
        </Canvas>
      </div>
    </ModelBoundary>
  );
}
