import type { Finding } from "@/features/consultations/schema";

export const THIRD_MOLARS = ["18", "28", "38", "48"];
export const IMPACTION_PRESETS = [
  { value: "mesial", label: "Mesial tilt", condition: "Impacted tooth — mesial" },
  { value: "distal", label: "Distal tilt", condition: "Impacted tooth — distal" },
  { value: "horizontal", label: "Horizontal", condition: "Impacted tooth — horizontal" },
] as const;
export type Impaction = (typeof IMPACTION_PRESETS)[number]["value"];
export type IllustrationGroup = "presence" | "crown" | "bracket" | "impaction";
const missingConditions = [
  "missing",
  "missing tooth",
  "absent tooth",
  "tooth absent",
  "extracted tooth",
];

// Only explicit labels activate illustrations. Proposed procedures and incidental
// mentions in free text never hide a tooth or imply completed treatment.
export function illustrationGroup(condition: string): IllustrationGroup | null {
  const value = condition.trim().toLowerCase();
  if (missingConditions.includes(value)) return "presence";
  if (value === "crown present") return "crown";
  if (value === "orthodontic bracket present") return "bracket";
  if (IMPACTION_PRESETS.some((preset) => preset.condition.toLowerCase() === value))
    return "impaction";
  return null;
}

export function dentalIllustration(findings: Finding[], tooth: string) {
  const active = findings.filter(
    (finding) => finding.tooth === tooth && finding.status === "active",
  );
  const impact = THIRD_MOLARS.includes(tooth)
    ? (IMPACTION_PRESETS.find((preset) =>
        active.some((finding) => finding.condition === preset.condition),
      )?.value ?? null)
    : null;
  return {
    active,
    missing: active.some((finding) => illustrationGroup(finding.condition) === "presence"),
    crown: active.some((finding) => illustrationGroup(finding.condition) === "crown"),
    bracket: active.some((finding) => illustrationGroup(finding.condition) === "bracket"),
    impaction: impact,
  };
}

// Copy forward the same finding identity to resolve a saved state in this draft.
// Prior finalized content is immutable; unrelated findings/pins are untouched.
export function illustrationChanges(findings: Finding[], tooth: string, group: IllustrationGroup) {
  return findings
    .filter(
      (finding) =>
        finding.tooth === tooth &&
        finding.status === "active" &&
        !finding.anchor &&
        illustrationGroup(finding.condition) === group,
    )
    .map((finding): Finding => ({ ...finding, status: "resolved" }));
}
