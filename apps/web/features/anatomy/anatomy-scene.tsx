"use client";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial, Vector3 } from "three";
import type { AnatomyAnchor, AnatomyCamera, AnatomyFinding, AnatomyLayer } from "./schema";
import { anatomyAsset, structures } from "./asset-registry";

function Camera({ view, reset }: { view: AnatomyCamera; reset: number }) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    const positions = {
      front: [0, 0, 2.8],
      back: [0, 0, -2.8],
      left: [2.8, 0, 0],
      right: [-2.8, 0, 0],
    };
    camera.position.fromArray(positions[view]);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, view, reset]);
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
        color: layer === "body" ? "#c9d8dc" : "#f0e8d4",
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
          ? "#44b6b0"
          : layer === "body"
            ? "#c9d8dc"
            : "#f0e8d4",
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
        .map((value, index) => {
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
                onClick={() => onSelect?.(value.structure_id)}
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
  findings: AnatomyFinding[];
  annotate?: boolean;
  onSelect?: (id: string) => void;
  onAnchor?: (id: string, anchor: AnatomyAnchor) => void;
};
export default function AnatomyScene(
  props: SceneProps & { view: AnatomyCamera; reset: number; onFailure: () => void },
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
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", props.onFailure, { once: true });
        }}
        fallback={<p>3D is unavailable. Switch to the 2D map.</p>}
      >
        <ambientLight intensity={1.6} />
        <directionalLight position={[3, 4, 5]} intensity={2.5} />
        <Suspense fallback={null}>
          <Model key={props.layer} {...props} onReady={onReady} />
        </Suspense>
        <Camera view={props.view} reset={props.reset} />
        <OrbitControls makeDefault enableDamping={false} minDistance={0.25} maxDistance={6} />
      </Canvas>
    </div>
  );
}
