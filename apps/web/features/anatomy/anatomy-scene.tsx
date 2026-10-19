"use client";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial, Vector3, PerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsHandle } from "three-stdlib";
import type { AnatomyAnchor, AnatomyCamera, AnatomyFinding, AnatomyLayer } from "./schema";
import { anatomyAsset, structures } from "./asset-registry";
import { boundsCenter, fitDistance, focusDistance } from "./camera-focus";
import { placeCamera } from "@/lib/three/place-camera";

function Camera({
  view,
  reset,
  zoom = 0,
  layer,
  selected,
  isolate,
  focus,
}: Pick<SceneProps, "layer" | "selected" | "isolate" | "focus"> & {
  view: AnatomyCamera;
  reset: number;
  zoom?: number;
}) {
  const { camera, controls: genericControls, invalidate, size } = useThree();
  const controls = genericControls as OrbitControlsHandle | undefined;
  const targetId = isolate ? selected : focus;
  const framing = useMemo(() => {
    const entries = structures.filter((value) => value.layer === layer);
    const lower = [0, 1, 2].map((axis) =>
      Math.min(...entries.map((value) => value.bounds.min[axis])),
    );
    const upper = [0, 1, 2].map((axis) =>
      Math.max(...entries.map((value) => value.bounds.max[axis])),
    );
    const full = { min: lower, max: upper };
    const target = entries.find((value) => value.id === targetId)?.bounds;
    return { full, target, center: new Vector3(...boundsCenter(target ?? full)) };
  }, [layer, targetId]);
  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const aspect = size.width / size.height;
    const fullDistance = fitDistance(framing.full, view, aspect, camera.fov);
    const selectedDistance = framing.target
      ? fitDistance(framing.target, view, aspect, camera.fov)
      : fullDistance;
    const distance = isolate
      ? selectedDistance
      : framing.target
        ? focusDistance(fullDistance, selectedDistance)
        : fullDistance;
    const direction = { front: [0, 0, 1], back: [0, 0, -1], left: [1, 0, 0], right: [-1, 0, 0] }[
      view
    ];
    placeCamera(
      camera,
      controls,
      framing.center,
      new Vector3(...direction),
      Math.max(distance, 0.12),
    );
    invalidate();
  }, [camera, controls, framing, isolate, view, reset, size.width, size.height, invalidate]);
  const priorZoom = useRef(zoom);
  useEffect(() => {
    const delta = zoom - priorZoom.current;
    priorZoom.current = zoom;
    if (!delta) return;
    const target = controls?.target ?? framing.center;
    const offset = camera.position.clone().sub(target).multiplyScalar(Math.pow(0.8, delta));
    offset.clampLength(0.06, 12);
    camera.position.copy(target).add(offset);
    controls?.update();
    camera.updateProjectionMatrix();
    invalidate();
  }, [zoom, camera, controls, framing.center, invalidate]);
  return null;
}
function ContextLoss({ onFailure }: { onFailure: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onFailure]);
  return null;
}
function Model({
  layer,
  selected,
  isolate,
  findings,
  annotate,
  onSelect,
  onAnchor,
  onFindingSelect,
  onReady,
}: SceneProps & { onReady: () => void }) {
  const { invalidate } = useThree();
  const asset = anatomyAsset(layer);
  const loaded = useGLTF(asset!.url);
  const scene = useMemo(() => {
    const result = loaded.scene.clone(true);
    result.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.material = new MeshStandardMaterial({
        color: layer === "body" ? "#cdd4d6" : "#e1ded5",
        roughness: 0.8,
      });
    });
    return result;
  }, [loaded.scene, layer]);
  useLayoutEffect(() => {
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.visible = !isolate || object.userData.structure_id === selected;
      object.raycast = object.visible ? Mesh.prototype.raycast : () => {};
      (object.material as MeshStandardMaterial).color.set(
        object.userData.structure_id === selected
          ? "#71d2cc"
          : layer === "body"
            ? "#cdd4d6"
            : "#e1ded5",
      );
    });
    invalidate();
  }, [scene, selected, isolate, layer, invalidate]);
  useEffect(onReady, [onReady]);
  useEffect(
    () => () =>
      scene.traverse((object) => {
        if (object instanceof Mesh) (object.material as MeshStandardMaterial).dispose();
      }),
    [scene],
  );
  function click(event: ThreeEvent<MouseEvent>) {
    if (event.delta > 4) return;
    const id = event.object.userData.structure_id;
    const entry = structures.find((value) => value.id === id && value.layer === layer);
    if (!entry) return;
    event.stopPropagation();
    onSelect?.(entry.id);
    if (annotate)
      onAnchor?.(entry.id, {
        kind: "model",
        asset_version: entry.asset_version,
        mesh_id: entry.mesh_id,
        point: event.object.worldToLocal(event.point.clone()).toArray() as [number, number, number],
      });
  }
  return (
    <group position={[0, -0.9, 0]}>
      <primitive object={scene} onClick={click} />
      {findings
        .filter(
          (value) =>
            value.layer === layer &&
            value.anchor?.kind === "model" &&
            value.anchor.asset_version === asset!.id &&
            (!isolate || value.structure_id === selected),
        )
        .map((value) => {
          const index = findings.findIndex((item) => item.key === value.key);
          const anchor = value.anchor!;
          if (anchor.kind !== "model") return null;
          const mesh = scene
            .getObjectsByProperty("type", "Mesh")
            .find((object) => object.userData.structure_id === anchor.mesh_id);
          if (!mesh) return null;
          mesh.updateWorldMatrix(true, false);
          const point = scene.worldToLocal(mesh.localToWorld(new Vector3(...anchor.point)));
          // The cloned scene is untransformed; the surrounding group owns centering.
          return (
            <Html key={value.key} position={point.toArray()} center zIndexRange={[20, 1]}>
              <button
                type="button"
                aria-label={`Finding ${index + 1}: ${value.description}`}
                onClick={() =>
                  onFindingSelect ? onFindingSelect(value.key) : onSelect?.(value.structure_id)
                }
                className="grid size-7 place-items-center rounded-full border-2 border-background bg-primary text-xs font-semibold text-primary-foreground shadow-sm"
              >
                {index + 1}
              </button>
            </Html>
          );
        })}
    </group>
  );
}
export type SceneProps = {
  layer: AnatomyLayer;
  selected: string;
  isolate: boolean;
  focus?: string;
  findings: AnatomyFinding[];
  annotate?: boolean;
  onSelect?: (id: string) => void;
  onFindingSelect?: (key: string) => void;
  onAnchor?: (id: string, anchor: AnatomyAnchor) => void;
};
export default function AnatomyScene(
  props: SceneProps & { view: AnatomyCamera; reset: number; zoom?: number; onFailure: () => void },
) {
  const [readyLayer, setReadyLayer] = useState("");
  const onReady = useCallback(() => setReadyLayer(props.layer), [props.layer]);
  return (
    <div className="relative h-full w-full">
      {readyLayer !== props.layer && (
        <p
          role="status"
          className="pointer-events-none absolute inset-x-0 top-4 z-10 text-center text-sm"
        >
          Loading anatomical model…
        </p>
      )}
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 2.8], fov: 42, near: 0.01, far: 50 }}
        fallback={<p>3D is unavailable. Use the 2D reference map.</p>}
      >
        <ambientLight intensity={1.6} />
        <directionalLight position={[3, 4, 5]} intensity={2.5} />
        <Suspense fallback={null}>
          <Model key={props.layer} {...props} onReady={onReady} />
        </Suspense>
        <Camera
          view={props.view}
          reset={props.reset}
          zoom={props.zoom}
          layer={props.layer}
          selected={props.selected}
          isolate={props.isolate}
          focus={props.focus}
        />
        <ContextLoss onFailure={props.onFailure} />
        <OrbitControls makeDefault enableDamping={false} minDistance={0.06} maxDistance={12} />
      </Canvas>
    </div>
  );
}
