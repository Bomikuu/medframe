import { z } from "zod";
import type { ClinicalDetailsFragment } from "@/lib/graphql/generated";

const review = z.enum(["unreviewed", "none_reported", "recorded"]);
export const clinicalSchema = z
  .object({
    expectedVersion: z.number().int().min(0),
    medicalHistory: z.string().trim().max(2000, "Use 2,000 characters or fewer."),
    conditions: z.string().trim().max(2000, "Use 2,000 characters or fewer."),
    pastProcedures: z.string().trim().max(2000, "Use 2,000 characters or fewer."),
    allergyState: review,
    allergies: z
      .array(
        z.object({
          substance: z.string().trim().min(1, "Enter an allergen.").max(120),
          reaction: z.string().trim().max(240),
          severity: z.enum(["unknown", "mild", "moderate", "severe"]),
        }),
      )
      .max(20),
    medicationState: review,
    medications: z
      .array(
        z.object({
          name: z.string().trim().min(1, "Enter a medication name.").max(120),
          dose: z.string().trim().max(80),
          frequency: z.string().trim().max(80),
        }),
      )
      .max(20),
    reason: z.string().trim().max(240, "Use 240 characters or fewer."),
  })
  .superRefine((values, context) => {
    for (const [state, items, path] of [
      [values.allergyState, values.allergies, "allergyState"],
      [values.medicationState, values.medications, "medicationState"],
    ] as const) {
      if ((state === "recorded") !== !!items.length)
        context.addIssue({
          code: "custom",
          path: [path],
          message: "Add an entry for recorded information, or choose a different review state.",
        });
    }
    const wire = {
      expected_version: 9999999999,
      medical_history: values.medicalHistory,
      conditions: values.conditions,
      past_procedures: values.pastProcedures,
      allergy_state: values.allergyState,
      allergies: values.allergies,
      medication_state: values.medicationState,
      medications: values.medications,
      reason: values.reason,
    };
    if (new TextEncoder().encode(JSON.stringify(wire)).length > 12000)
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message:
          "This history is too large to save at once. Shorten the entries and try again; your input is still here.",
      });
  });
export type ClinicalValues = z.infer<typeof clinicalSchema>;
export function clinicalDefaults(revision: ClinicalDetailsFragment | null): ClinicalValues {
  return {
    expectedVersion: revision?.version ?? 0,
    medicalHistory: revision?.medicalHistory ?? "",
    conditions: revision?.conditions ?? "",
    pastProcedures: revision?.pastProcedures ?? "",
    allergyState: (revision?.allergyState as ClinicalValues["allergyState"]) ?? "unreviewed",
    allergies:
      revision?.allergies.map(({ substance, reaction, severity }) => ({
        substance,
        reaction,
        severity: severity as ClinicalValues["allergies"][number]["severity"],
      })) ?? [],
    medicationState:
      (revision?.medicationState as ClinicalValues["medicationState"]) ?? "unreviewed",
    medications:
      revision?.medications.map(({ name, dose, frequency }) => ({ name, dose, frequency })) ?? [],
    reason: "",
  };
}
