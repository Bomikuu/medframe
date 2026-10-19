import type { Structure } from "./asset-registry";
import type { AnatomyCamera } from "./schema";

// Camera navigation only; never change the registry's patient side or pin coordinates.
export function structureView(structure: Structure): AnatomyCamera {
  const label = structure.label.toLowerCase();
  if (
    /posterior|gluteal|popliteal|occipital|scapul|sacral|sacrum|coccyx|lumbar|vertebr|heel|retromalleolar/.test(
      label,
    ) ||
    /dorsum of hand|dorsal surfaces of digits of hand/.test(label)
  )
    return "back";
  if (/anterior|frontal|pectoral|palmar|palm/.test(label)) return "front";
  if (/lateral|temporal|auricul|mastoid|deltoid|hip region/.test(label)) {
    if (structure.side === "left" || structure.side === "right") return structure.side;
  }
  return "front";
}

export type CameraBounds = { min: number[]; max: number[] };
export function boundsCenter(bounds: CameraBounds): [number, number, number] {
  return [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2 - 0.9,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
}

export function fitDistance(
  bounds: CameraBounds,
  view: AnatomyCamera,
  aspect: number,
  fov: number,
) {
  const extent = bounds.max.map((value, axis) => value - bounds.min[axis]);
  const lateral = view === "left" || view === "right";
  const tangent = Math.tan((fov * Math.PI) / 360);
  const horizontal = lateral ? extent[2] : extent[0];
  const depth = lateral ? extent[0] : extent[2];
  return (
    Math.max(extent[1] / (2 * tangent), horizontal / (2 * tangent * aspect)) * 1.16 + depth / 2
  );
}

export function focusDistance(fullDistance: number, selectedDistance: number) {
  // About 1.4× closer, while keeping even large selected structures within the view.
  return Math.max(fullDistance * 0.72, selectedDistance, 0.12);
}
