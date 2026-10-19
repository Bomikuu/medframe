import type { Structure } from "./asset-registry";

export const regionGroups = [
  { id: "head", label: "Head & neck" },
  { id: "thorax", label: "Thorax & back" },
  { id: "abdomen", label: "Abdomen" },
  { id: "pelvis", label: "Pelvis" },
  { id: "upper", label: "Upper limb" },
  { id: "lower", label: "Lower limb" },
] as const;
export type RegionGroup = (typeof regionGroups)[number]["id"];

// Display grouping only. Persisted structure/side identifiers remain registry-owned.
export function navigationGroup(structure: Structure): RegionGroup {
  const label = structure.label.toLowerCase();
  if (
    /hand|finger|arm|elbow|wrist|palm|bicipital|cubital|foveola|humerus|radius|ulna|metacarpal|clavicle|deltoid/.test(
      label,
    )
  )
    return "upper";
  if (
    /foot|toe|leg|thigh|knee|ankle|malleol|heel|sole|metatarsal|femur|tibia|fibula|patella|talus|calcaneus|cuneiform|navicular|cuboid|popliteal/.test(
      label,
    )
  )
    return "lower";
  if (
    /pelvis|hip|gluteal|inguinal|hypogastric|urogenital|anal region|sacral|sacrum|coccyx/.test(
      label,
    )
  )
    return "pelvis";
  if (/abdomen|epigastric|hypochondriac|umbilic|lumbar/.test(label)) return "abdomen";
  const height = (structure.bounds.min[1] + structure.bounds.max[1]) / 2;
  if (height > 1.38 || /neck|hyoid|vertebra C|atlas|axis/i.test(label)) return "head";
  return "thorax";
}
export function groupLabel(structure: Structure) {
  return regionGroups.find((group) => group.id === navigationGroup(structure))!.label;
}
