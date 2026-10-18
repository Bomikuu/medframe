"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import {
  Box3,
  Color,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Vector3,
  type Camera,
  type Object3D,
} from "three";
import type { OrbitControls as OrbitControlsInstance } from "three-stdlib";
import type { Finding } from "@/features/consultations/schema";
import { isPermanentTooth, toothPresentation, type DentalView, type JawView } from "./anatomy";
import { AnnotationPins, type AnnotationInteraction } from "./annotation-pins";

type PreparedAnatomy = {
  root: Object3D;
  teeth: Mesh[];
  originals: Map<MeshStandardMaterial, { emissive: Color; intensity: number }>;
};

type Presentation = {
  findings: Finding[];
  selected: string;
  jaw: JawView;
  isolate: boolean;
  anatomyOnly: boolean;
  reference: boolean;
};

// These adapters own imperative Three.js updates to the per-view scene clone.
// React state and the shared useGLTF source remain untouched.
function updatePresentation(prepared: PreparedAnatomy, options: Presentation) {
  const { findings, selected, jaw, isolate, anatomyOnly, reference } = options;
  for (const mesh of prepared.teeth) {
    const id = String(mesh.userData.tooth_id);
    const condition = toothPresentation(findings, id);
    mesh.visible =
      (reference || isolate || jaw === "both" || mesh.userData.jaw === jaw) &&
      (!isolate || id === selected) &&
      (anatomyOnly || !condition.missing);
    // A hidden tooth cannot intercept a click on another jaw/tooth.
    mesh.raycast = mesh.visible ? Mesh.prototype.raycast : () => {};
    const materials = (
      Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    ) as MeshStandardMaterial[];
    for (const material of materials) {
      const original = prepared.originals.get(material)!;
      material.emissive.copy(original.emissive);
      material.emissiveIntensity = original.intensity;
      if (id === selected) {
        material.emissive.set("#0ea5a4");
        material.emissiveIntensity = 0.3;
      } else if (!anatomyOnly && condition.active.length) {
        material.emissive.set("#a75b12");
        material.emissiveIntensity = 0.18;
      }
    }
  }
}

function frameAnatomy(
  prepared: PreparedAnatomy,
  camera: Camera,
  controls: OrbitControlsInstance | null,
  size: { width: number; height: number },
  view: DentalView,
) {
  if (!(camera instanceof PerspectiveCamera)) return;
  prepared.root.updateMatrixWorld(true);
  const bounds = new Box3();
  for (const mesh of prepared.teeth) {
    if (!mesh.visible) continue;
    mesh.geometry.computeBoundingBox();
    bounds.union(mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld));
  }
  // An explicitly missing isolated tooth has no visible mesh; retain a valid
  // frame and explain the missing anatomy in the surrounding UI.
  if (bounds.isEmpty()) bounds.setFromObject(prepared.root);
  const center = bounds.getCenter(new Vector3());
  const extent = bounds.getSize(new Vector3());
  const directions: Record<DentalView, [number, number, number]> = {
    front: [0, 0, 1],
    upper: [0, -1, 0],
    lower: [0, 1, 0],
    left: [1, 0, 0],
    right: [-1, 0, 0],
  };
  const direction = new Vector3(...directions[view]);
  const vertical = view === "upper" || view === "lower" ? extent.z : extent.y;
  const horizontal = view === "left" || view === "right" ? extent.z : extent.x;
  const depth =
    view === "front" ? extent.z : view === "left" || view === "right" ? extent.x : extent.y;
  const tangent = Math.tan((camera.fov * Math.PI) / 360);
  const distance =
    (Math.max(vertical / (2 * tangent), horizontal / ((2 * tangent * size.width) / size.height)) +
      depth / 2) *
    1.12;
  camera.position.copy(center).addScaledVector(direction, Math.max(distance, 0.1));
  camera.up.set(
    0,
    view === "upper" || view === "lower" ? 0 : 1,
    view === "upper" || view === "lower" ? 1 : 0,
  );
  camera.near = Math.max(0.001, distance / 100);
  camera.far = Math.max(100, distance * 20);
  camera.updateProjectionMatrix();
  camera.lookAt(center);
  if (controls) {
    controls.target.copy(center);
    controls.minDistance = Math.max(0.08, extent.length() * 0.35);
    controls.maxDistance = Math.max(1, extent.length() * 6);
    controls.update();
  }
}

export function AnatomicalScene({
  url,
  selected,
  onSelect,
  findings,
  jaw,
  isolate,
  view,
  reset,
  anatomyOnly,
  reference,
  controls,
  onReady,
  annotations,
}: {
  url: string;
  selected: string;
  onSelect: (id: string) => void;
  findings: Finding[];
  jaw: JawView;
  isolate: boolean;
  view: DentalView;
  reset: number;
  anatomyOnly: boolean;
  reference: boolean;
  controls: RefObject<OrbitControlsInstance | null>;
  onReady: () => void;
  annotations?: AnnotationInteraction;
}) {
  const { scene } = useGLTF(url);
  const { camera, size, invalidate } = useThree();
  const notified = useRef(false);
  const frameSelection = isolate ? selected : null;
  const missingKey = findings
    .filter((finding) => toothPresentation([finding], finding.tooth).missing)
    .map((finding) => finding.tooth)
    .sort()
    .join(",");
  const prepared = useMemo(() => {
    const root = scene.clone(true);
    const teeth: Mesh[] = [];
    const originals = new Map<MeshStandardMaterial, { emissive: Color; intensity: number }>();
    root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (!isPermanentTooth(object.userData.tooth_id)) {
        throw new Error("An anatomical mesh has no valid FDI identity.");
      }
      const multipleMaterials = Array.isArray(object.material);
      const materials = (Array.isArray(object.material) ? object.material : [object.material]).map(
        (source) => {
          if (!(source instanceof MeshStandardMaterial))
            throw new Error("Unsupported tooth material.");
          const material = source.clone();
          material.roughness = Math.max(0.45, material.roughness);
          originals.set(material, {
            emissive: material.emissive.clone(),
            intensity: material.emissiveIntensity,
          });
          return material;
        },
      );
      // Material arrays require geometry groups. Preserve the source shape so
      // single-material teeth remain drawable and raycastable.
      object.material = multipleMaterials ? materials : materials[0];
      teeth.push(object);
    });
    const expected = reference
      ? ["26"]
      : Array.from({ length: 32 }, (_, index) => `${Math.floor(index / 8) + 1}${(index % 8) + 1}`);
    if (
      teeth.length !== expected.length ||
      expected.some((id) => !teeth.some((tooth) => tooth.userData.tooth_id === id))
    ) {
      throw new Error("The anatomical asset has incomplete tooth identities.");
    }
    root.updateMatrixWorld(true);
    return { root, teeth, originals };
  }, [scene, reference]);

  useEffect(
    () => () => {
      for (const material of prepared.originals.keys()) material.dispose();
    },
    [prepared],
  );

  useLayoutEffect(() => {
    updatePresentation(prepared, { findings, selected, jaw, isolate, anatomyOnly, reference });
    invalidate();
  }, [prepared, selected, jaw, isolate, findings, anatomyOnly, reference, invalidate]);

  useLayoutEffect(() => {
    frameAnatomy(prepared, camera, controls.current, size, view);
    invalidate();
  }, [
    prepared,
    camera,
    controls,
    size,
    view,
    reset,
    jaw,
    isolate,
    frameSelection,
    anatomyOnly,
    missingKey,
    invalidate,
  ]);

  useFrame(() => {
    if (!notified.current) {
      notified.current = true;
      onReady();
    }
  });
  function select(event: ThreeEvent<MouseEvent>) {
    const id: unknown = event.object.userData.tooth_id;
    if (!event.object.visible || !isPermanentTooth(id) || event.delta > 4) return;
    event.stopPropagation();
    // Source geometry has no clinically reliable surface segmentation.
    onSelect(id);
    if (annotations?.tool === "comment") {
      annotations.onPlace({
        tooth: id,
        anchor: {
          asset: reference ? "dundee-molar26-v1" : "dundee-permanent-v1",
          point: event.object.worldToLocal(event.point.clone()).toArray() as [
            number,
            number,
            number,
          ],
        },
      });
    }
  }
  const selectedMesh = prepared.teeth.find((mesh) => mesh.userData.tooth_id === selected);
  const labelPosition = selectedMesh
    ? new Box3().setFromObject(selectedMesh).getCenter(new Vector3())
    : null;
  return (
    <>
      <primitive object={prepared.root} onClick={select} />
      <AnnotationPins
        teeth={prepared.teeth}
        findings={findings}
        asset={reference ? "dundee-molar26-v1" : "dundee-permanent-v1"}
        interaction={annotations}
      />
      {labelPosition &&
        (anatomyOnly || !toothPresentation(findings, selected).missing) &&
        (reference || isolate || jaw === "both" || selectedMesh?.userData.jaw === jaw) && (
          <Html position={labelPosition} center style={{ pointerEvents: "none" }}>
            <span className="rounded-md border border-border bg-card px-2 py-1 text-xs font-semibold whitespace-nowrap text-foreground shadow-sm">
              {reference ? "Reference 26" : selected}
            </span>
          </Html>
        )}
    </>
  );
}
