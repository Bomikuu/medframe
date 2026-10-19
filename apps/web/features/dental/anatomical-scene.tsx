"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import {
  BackSide,
  Group,
  Matrix4,
  MeshBasicMaterial,
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
import { dentalFitDistance, toothDirection, type ToothFocus } from "./camera-focus";
import { applyImpaction } from "./tooth-transform";
import { clearIllustrationOverlays, updateIllustrationOverlays } from "./illustration-overlays";
import { placeCamera } from "@/lib/three/place-camera";

type PreparedAnatomy = {
  root: Object3D;
  teeth: Mesh[];
  originals: Map<MeshStandardMaterial, { emissive: Color; intensity: number; color: Color }>;
  transforms: Map<Mesh, Matrix4>;
  outlines: Map<Mesh, Mesh>;
  overlays: Group;
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
    applyImpaction(
      mesh,
      prepared.transforms.get(mesh)!,
      id,
      anatomyOnly ? null : condition.impaction,
    );
    prepared.outlines.get(mesh)!.visible = mesh.visible && id === selected;
    // A hidden tooth cannot intercept a click on another jaw/tooth.
    mesh.raycast = mesh.visible ? Mesh.prototype.raycast : () => {};
    const materials = (
      Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    ) as MeshStandardMaterial[];
    for (const material of materials) {
      const original = prepared.originals.get(material)!;
      material.color.copy(original.color);
      material.emissive.copy(original.emissive);
      material.emissiveIntensity = original.intensity;
      if (id === selected) {
        material.color.set("#45d4e5");
        material.emissive.set("#087e91");
        material.emissiveIntensity = 0.55;
      } else if (!anatomyOnly && condition.active.length) {
        material.emissive.set("#a75b12");
        material.emissiveIntensity = 0.18;
      }
    }
  }
  prepared.root.updateMatrixWorld(true);
  updateIllustrationOverlays(prepared.overlays, prepared.teeth, findings, selected, anatomyOnly);
}

function frameAnatomy(
  prepared: PreparedAnatomy,
  camera: Camera,
  controls: OrbitControlsInstance | null,
  size: { width: number; height: number },
  view: DentalView,
  focus: ToothFocus | null,
  isolate: boolean,
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
  const selectedMesh = focus
    ? prepared.teeth.find((mesh) => mesh.visible && mesh.userData.tooth_id === focus.tooth)
    : undefined;
  const targetBounds = selectedMesh ? new Box3().setFromObject(selectedMesh) : bounds;
  const center = targetBounds.getCenter(new Vector3());
  const extent = targetBounds.getSize(new Vector3());
  const directions: Record<DentalView, [number, number, number]> = {
    front: [0, 0, 1],
    upper: [0, -1, 0],
    lower: [0, 1, 0],
    left: [1, 0, 0],
    right: [-1, 0, 0],
  };
  const direction =
    selectedMesh && focus
      ? toothDirection(focus.tooth, focus.surface)
      : new Vector3(...directions[view]);
  const up = Math.abs(direction.y) > 0.9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
  const aspect = size.width / size.height;
  const fullDistance = dentalFitDistance(bounds, direction, up, aspect, camera.fov);
  const selectedDistance = dentalFitDistance(targetBounds, direction, up, aspect, camera.fov);
  const distance =
    selectedMesh && !isolate ? Math.max(fullDistance * 0.65, selectedDistance) : fullDistance;
  camera.near = Math.max(0.001, distance / 100);
  camera.far = Math.max(100, distance * 20);
  if (controls) {
    controls.minDistance = Math.min(distance * 0.5, Math.max(0.01, extent.length() * 0.15));
    controls.maxDistance = Math.max(fullDistance * 6, 1);
  }
  placeCamera(camera, controls, center, direction, distance, up);
}

function SelectionLabel({ mesh, text }: { mesh: Mesh; text: string }) {
  const group = useRef<Group>(null);
  useFrame(() => {
    const center = mesh.geometry.boundingBox!.getCenter(new Vector3());
    group.current?.position.copy(mesh.localToWorld(center));
  });
  return (
    <group ref={group}>
      <Html center zIndexRange={[8, 0]} style={{ pointerEvents: "none" }}>
        <span className="rounded-md border-2 border-white bg-cyan-900 px-3 py-2 text-xs font-bold whitespace-nowrap text-white shadow-md">
          {text}
        </span>
      </Html>
    </group>
  );
}

export function AnatomicalScene({
  url,
  selected,
  selectedSurface = null,
  onSelect,
  findings,
  jaw,
  isolate,
  view,
  reset,
  focus = null,
  anatomyOnly,
  reference,
  controls,
  onReady,
  annotations,
  showLabel = true,
}: {
  url: string;
  selected: string;
  selectedSurface?: string | null;
  onSelect: (id: string) => void;
  findings: Finding[];
  jaw: JawView;
  isolate: boolean;
  view: DentalView;
  reset: number;
  focus?: ToothFocus | null;
  anatomyOnly: boolean;
  reference: boolean;
  controls: RefObject<OrbitControlsInstance | null>;
  onReady: () => void;
  annotations?: AnnotationInteraction;
  showLabel?: boolean;
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
  const impactionKey = findings
    .map((finding) =>
      toothPresentation([finding], finding.tooth).impaction
        ? `${finding.tooth}:${finding.condition}:${finding.status}`
        : "",
    )
    .join("|");
  const prepared = useMemo(() => {
    const root = scene.clone(true);
    const teeth: Mesh[] = [];
    const originals: PreparedAnatomy["originals"] = new Map();
    const transforms = new Map<Mesh, Matrix4>();
    const outlines = new Map<Mesh, Mesh>();
    const overlays = new Group();
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
            color: material.color.clone(),
          });
          return material;
        },
      );
      // Material arrays require geometry groups. Preserve the source shape so
      // single-material teeth remain drawable and raycastable.
      object.material = multipleMaterials ? materials : materials[0];
      transforms.set(object, object.matrix.clone());
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
    // Add outlines after traversal so helpers never enter the tooth registry.
    for (const tooth of teeth) {
      tooth.geometry.computeBoundingBox();
      const center = tooth.geometry.boundingBox!.getCenter(new Vector3());
      const outline = new Mesh(
        tooth.geometry,
        new MeshBasicMaterial({ color: "#00687d", side: BackSide, depthWrite: false }),
      );
      outline.scale.setScalar(1.045);
      outline.position.copy(center).multiplyScalar(1 - 1.045);
      outline.visible = false;
      outline.raycast = () => {};
      tooth.add(outline);
      outlines.set(tooth, outline);
    }
    root.updateMatrixWorld(true);
    return { root, teeth, originals, transforms, outlines, overlays };
  }, [scene, reference]);

  useEffect(
    () => () => {
      for (const material of prepared.originals.keys()) material.dispose();
      for (const outline of prepared.outlines.values())
        (outline.material as MeshBasicMaterial).dispose();
      clearIllustrationOverlays(prepared.overlays);
    },
    [prepared],
  );

  useLayoutEffect(() => {
    updatePresentation(prepared, { findings, selected, jaw, isolate, anatomyOnly, reference });
    invalidate();
  }, [prepared, selected, jaw, isolate, findings, anatomyOnly, reference, invalidate]);

  useLayoutEffect(() => {
    frameAnatomy(prepared, camera, controls.current, size, view, focus, isolate);
    invalidate();
  }, [
    prepared,
    camera,
    controls,
    size,
    view,
    reset,
    focus,
    jaw,
    isolate,
    frameSelection,
    anatomyOnly,
    missingKey,
    impactionKey,
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
  return (
    <>
      <primitive object={prepared.root} onClick={select} />
      <primitive object={prepared.overlays} />
      <AnnotationPins
        teeth={prepared.teeth}
        findings={findings}
        asset={reference ? "dundee-molar26-v1" : "dundee-permanent-v1"}
        interaction={annotations}
      />
      {showLabel &&
        selectedMesh &&
        (anatomyOnly || !toothPresentation(findings, selected).missing) &&
        (reference || isolate || jaw === "both" || selectedMesh?.userData.jaw === jaw) && (
          <SelectionLabel
            mesh={selectedMesh}
            text={`${reference ? "Reference 26" : `Tooth ${selected}`}${selectedSurface ? ` · ${selectedSurface}` : ""}`}
          />
        )}
    </>
  );
}
