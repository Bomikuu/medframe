import { Box3, Vector3 } from "three";
import { isPermanentTooth } from "./anatomy";

export type ToothFocus = { tooth: string; surface: string | null };

// Approximate viewing directions only. The source has no surface segmentation;
// clinical labels and point anchors remain explicitly assigned by the clinician.
export function toothDirection(tooth: string, surface: string | null) {
  if (!isPermanentTooth(tooth)) return new Vector3(0, 0, 1);
  const quadrant = Number(tooth[0]);
  const upper = quadrant <= 2;
  const side = quadrant === 2 || quadrant === 3 ? 1 : -1;
  if (surface === "occlusal" || surface === "incisal") return new Vector3(0, upper ? -1 : 1, 0);
  // Anterior teeth face forward; posterior teeth face the patient's lateral side.
  const angle = ((Number(tooth[1]) - 1) / 7) * Math.PI * 0.5;
  const outward = new Vector3(side * Math.sin(angle), 0, Math.cos(angle));
  if (surface === "lingual" || surface === "palatal") return outward.negate();
  const mesial = new Vector3(-side * Math.cos(angle), 0, Math.sin(angle));
  if (surface === "mesial") return mesial;
  if (surface === "distal") return mesial.negate();
  return outward;
}

export function dentalFitDistance(
  bounds: Box3,
  direction: Vector3,
  up: Vector3,
  aspect: number,
  fov: number,
) {
  const center = bounds.getCenter(new Vector3());
  const right = new Vector3().crossVectors(up, direction).normalize();
  const vertical = new Vector3().crossVectors(direction, right).normalize();
  const tangent = Math.tan((fov * Math.PI) / 360);
  let distance = 0;
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) {
        const offset = new Vector3(x, y, z).sub(center);
        distance = Math.max(
          distance,
          offset.dot(direction) +
            Math.max(
              Math.abs(offset.dot(vertical)) / tangent,
              Math.abs(offset.dot(right)) / (tangent * aspect),
            ),
        );
      }
  return Math.max(distance * 1.12, 0.1);
}
