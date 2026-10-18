import { z } from "zod";

export const diagnosisSchema = z.object({
  description: z.string().trim().min(1).max(240),
  certainty: z.enum(["reported", "observed", "suspected", "confirmed", "resolved"]),
  code: z.string().max(40),
});
export const findingSchema = z.object({
  key: z.string().uuid(),
  tooth: z.string(),
  surfaces: z.array(z.string()).max(5),
  condition: z.string().trim().min(1).max(120),
  severity: z.enum(["unknown", "mild", "moderate", "severe"]),
  status: z.enum(["active", "resolved", "historical"]),
  notes: z.string().max(500),
});
export const procedureSchema = z.object({
  description: z.string().trim().min(1).max(240),
  status: z.enum(["proposed", "planned", "in_progress", "completed", "cancelled"]),
  tooth: z.string(),
  surfaces: z.array(z.string()).max(5),
  notes: z.string().max(500),
});
export const draftSchema = z.object({
  soap: z.object({
    subjective: z.string().max(6000),
    objective: z.string().max(6000),
    assessment: z.string().max(6000),
    plan: z.string().max(6000),
  }),
  diagnoses: z.array(diagnosisSchema).max(20),
  observations: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(120),
        value: z.string().trim().min(1).max(240),
        source: z.enum(["reported", "observed"]),
      }),
    )
    .max(30),
  findings: z.array(findingSchema).max(80),
  procedures: z.array(procedureSchema).max(30),
  document_ids: z.array(z.string().uuid()).max(20),
});
export const encounterFormSchema = z
  .object({ content: draftSchema, expectedVersion: z.number().int().positive() })
  .refine(
    (value) => new TextEncoder().encode(JSON.stringify(value.content)).byteLength <= 49152,
    "Keep the combined draft within 48KiB.",
  );
export type Draft = z.infer<typeof draftSchema>;
export type EncounterForm = z.infer<typeof encounterFormSchema>;
export type Finding = z.infer<typeof findingSchema>;
export const toothSchema = z.object({
  id: z.string(),
  label: z.string(),
  dentition: z.enum(["primary", "permanent"]),
  jaw: z.enum(["upper", "lower"]),
  surfaces: z.array(z.string()),
});
export const dentalReferenceSchema = z.object({ version: z.number(), teeth: z.array(toothSchema) });
export type Tooth = z.infer<typeof toothSchema>;
