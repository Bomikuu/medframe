import { z } from "zod";
import { findingSchema, diagnosisSchema, procedureSchema } from "@/features/consultations/schema";
import { themeSchema } from "@/features/branding/schema";
export const releasePayloadSchema = z.object({
  summary: z.string(),
  encounters: z.array(
    z.object({
      id: z.string(),
      version: z.number(),
      created_at: z.string(),
      reason: z.string(),
      author: z.string(),
      soap: z.object({
        subjective: z.string().optional(),
        objective: z.string().optional(),
        assessment: z.string().optional(),
        plan: z.string().optional(),
      }),
      diagnoses: z.array(diagnosisSchema).optional(),
      procedures: z.array(procedureSchema).optional(),
    }),
  ),
  chart: z
    .object({
      id: z.string(),
      version: z.number(),
      created_at: z.string(),
      findings: z.array(findingSchema),
    })
    .nullable(),
  plans: z.array(
    z.object({
      id: z.string(),
      version: z.number(),
      created_at: z.string(),
      snapshot: z.object({
        title: z.string(),
        completed: z.number(),
        active_total: z.number(),
        items: z.array(
          z.object({
            id: z.string(),
            description: z.string(),
            tooth: z.string(),
            status: z.string(),
          }),
        ),
      }),
    }),
  ),
  follow_ups: z.array(
    z.object({
      id: z.string(),
      version: z.number(),
      created_at: z.string(),
      snapshot: z.object({
        instructions: z.string(),
        status: z.string(),
        due_date: z.string().nullable(),
      }),
    }),
  ),
  documents: z.array(
    z.object({
      id: z.string(),
      version: z.number(),
      label: z.string(),
      filename: z.string(),
      content_type: z.string(),
      size: z.number(),
    }),
  ),
});
export const releaseRowSchema = z.object({
  id: z.string(),
  sequence: z.number(),
  created_at: z.string(),
  author: z.string(),
  summary: z.string(),
  state: z.string(),
  state_version: z.number(),
});
export const reportSchema = z.object({
  id: z.string(),
  category: z.string(),
  text: z.string(),
  created_at: z.string(),
  author: z.string(),
  state: z.string(),
  version: z.number(),
  history_revision_id: z.string().nullable(),
});
export const portalLinkSchema = z.object({
  id: z.string(),
  patient_name: z.string(),
  clinic_name: z.string(),
  relationship: z.enum(["self", "guardian"]),
});
export const portalWorkspaceSchema = z.object({
  clinic_name: z.string(),
  patient_name: z.string(),
  reference: z.string(),
  relationship: z.enum(["self", "guardian"]),
  theme: z.preprocess(
    (value) => (value && typeof value === "object" ? { ...value, logo_id: null } : value),
    themeSchema,
  ),
  mode: z.enum(["light", "dark", "system"]),
  density: z.enum(["inherit", "comfortable", "compact"]),
  preferences_version: z.number(),
  logo_ticket: z.string().nullable(),
});
