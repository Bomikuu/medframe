/** Presentation labels for saved setup values; never transform names or contact details. */
export const providerCounts: Record<string, string> = {
  just_me: "One provider",
  "2_5": "2–5 providers",
  "6_10": "6–10 providers",
  "11_20": "11–20 providers",
  "20_plus": "20+ providers",
};
export const providerTypes: Record<string, string> = {
  dentist: "Dentist",
  physician: "Physician",
  nurse: "Nurse",
  medical_assistant: "Medical assistant",
  other: "Other",
};
export const walkInPolicies: Record<string, string> = {
  both: "Appointments and walk-ins",
  appointments: "Appointments only",
  walk_ins: "Walk-ins accepted",
};
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export function operatingDays(value: unknown) {
  if (!Array.isArray(value)) return "Not specified";
  const selected = weekdays.filter((_, index) => value.includes(index));
  return selected.length === 7 ? "Every day" : selected.join(", ") || "Not specified";
}
export function selectedProviderTypes(value: unknown) {
  if (!Array.isArray(value)) return "Not specified";
  return (
    value
      .map((code) => providerTypes[String(code)] ?? String(code).replaceAll("_", " "))
      .join(", ") || "Not specified"
  );
}
