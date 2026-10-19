import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Plane,
  Quaternion,
  Vector3,
} from "three";
import type { Finding } from "@/features/consultations/schema";
import { dentalIllustration } from "./illustration";
import { toothDirection } from "./camera-focus";

export function clearIllustrationOverlays(group: Group) {
  for (const child of [...group.children]) {
    child.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      // Crown shells share source geometry; only accessory geometry is ours.
      if (!object.userData.sharedGeometry) object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
    group.remove(child);
  }
}

// These accessories are deliberately schematic, never fabricated scans or
// preparation margins. All coordinates follow the transformed reference tooth.
export function updateIllustrationOverlays(
  group: Group,
  teeth: Mesh[],
  findings: Finding[],
  selected: string,
  anatomyOnly: boolean,
) {
  clearIllustrationOverlays(group);
  if (anatomyOnly) return;
  for (const tooth of teeth) {
    if (!tooth.visible) continue;
    const id = String(tooth.userData.tooth_id);
    const state = dentalIllustration(findings, id);
    const bounds = tooth.geometry.boundingBox!.clone().applyMatrix4(tooth.matrixWorld);
    const size = bounds.getSize(new Vector3());
    const upper = Number(id[0]) <= 2;
    if (state.crown) {
      const cut = upper ? bounds.min.y + size.y * 0.4 : bounds.max.y - size.y * 0.4;
      const material = new MeshStandardMaterial({
        color: id === selected ? "#44d8e4" : "#e4d4a2",
        roughness: 0.24,
        metalness: 0.22,
        clippingPlanes: [new Plane(new Vector3(0, upper ? -1 : 1, 0), upper ? cut : -cut)],
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const crown = new Mesh(tooth.geometry, material);
      crown.userData.sharedGeometry = true;
      crown.matrixAutoUpdate = false;
      crown.matrix.copy(tooth.matrixWorld);
      crown.raycast = () => {};
      group.add(crown);
    }
    if (state.bracket) {
      const outward = toothDirection(id, "buccal");
      const position = bounds.getCenter(new Vector3());
      position.y = upper ? bounds.min.y + size.y * 0.2 : bounds.max.y - size.y * 0.2;
      const radius = (Math.abs(outward.x) * size.x) / 2 + (Math.abs(outward.z) * size.z) / 2;
      position.addScaledVector(outward, radius * 0.92);
      const width = Math.min(size.x, size.z) * 0.42;
      const assembly = new Group();
      assembly.position.copy(position);
      assembly.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), outward));
      const bracket = new Mesh(
        new BoxGeometry(width, width * 0.8, width * 0.4),
        new MeshStandardMaterial({ color: "#9caec0", metalness: 0.8, roughness: 0.28 }),
      );
      const wire = new Mesh(
        new BoxGeometry(width * 2.5, width * 0.12, width * 0.12),
        new MeshStandardMaterial({ color: new Color("#566b80"), metalness: 0.85, roughness: 0.25 }),
      );
      wire.position.z = width * 0.23;
      bracket.raycast = wire.raycast = () => {};
      assembly.add(bracket, wire);
      group.add(assembly);
    }
  }
}
