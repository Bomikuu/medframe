export const PERMANENT_MODEL = "/models/dental-permanent-dundee-v1.glb";
export const MOLAR_REFERENCE_MODEL = "/models/dental-molar-26-dundee-v1.glb";
export const PERMANENT_IDS = [1, 2, 3, 4].flatMap((quadrant) =>
  Array.from({ length: 8 }, (_, index) => `${quadrant}${index + 1}`),
);
export type DentalView = "front" | "upper" | "lower" | "left" | "right";
export type JawView = "both" | "upper" | "lower";

export function isPermanentTooth(value: unknown): value is string {
  return typeof value === "string" && PERMANENT_IDS.includes(value);
}

export { dentalIllustration as toothPresentation } from "./illustration";

export const VIEW_OPTIONS: { value: DentalView; label: string }[] = [
  { value: "front", label: "Front view" },
  { value: "upper", label: "Upper occlusal" },
  { value: "lower", label: "Lower occlusal" },
  { value: "left", label: "Patient left" },
  { value: "right", label: "Patient right" },
];
