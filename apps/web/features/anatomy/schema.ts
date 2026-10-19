import { z } from "zod";
export const anatomyAnchorSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("model"),
    asset_version: z.string(),
    mesh_id: z.string(),
    point: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]),
  }),
  z.object({
    kind: z.literal("map"),
    reference_version: z.literal(1),
    view: z.enum(["front", "back", "left", "right"]),
    point: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
  }),
]);
export const anatomyFindingSchema = z.object({
  key: z.string().uuid(),
  registry_version: z.literal(1),
  layer: z.enum(["body", "skeleton"]),
  structure_id: z.string(),
  side: z.enum(["left", "right", "midline", "bilateral"]),
  description: z.string().trim().min(1).max(240),
  category: z.enum(["reported", "observed", "suspected", "confirmed"]),
  severity: z.enum(["unknown", "mild", "moderate", "severe"]),
  status: z.enum(["active", "resolved", "historical", "entered_in_error"]),
  notes: z.string().max(1000),
  terminology_system: z.string().max(80),
  code: z.string().max(80),
  source_revision_id: z.string().uuid().nullable().optional(),
  anchor: anatomyAnchorSchema.nullable().optional(),
});
export type AnatomyFinding = z.infer<typeof anatomyFindingSchema>;
export type AnatomyAnchor = z.infer<typeof anatomyAnchorSchema>;
export type AnatomyLayer = "body" | "skeleton";
export type AnatomyCamera = "front" | "back" | "left" | "right";
export const recordedFindingSchema = anatomyFindingSchema.extend({
  recorded_at: z.string(),
  author: z.string(),
  source_revision_id: z.string().uuid(),
});
export const chartStampSchema = z.object({
  id: z.string(),
  revision_id: z.string(),
  version: z.number(),
  created_at: z.string(),
  author: z.string(),
  encounter_id: z.string(),
  registry_version: z.number(),
});
export const anatomyPageSchema = z.object({
  items: z.array(recordedFindingSchema),
  end_cursor: z.string().nullable(),
  has_next_page: z.boolean(),
  chart: chartStampSchema.nullable(),
  historical: z.boolean(),
});
export const anatomyRevisionPageSchema = z.object({
  items: z.array(chartStampSchema),
  end_cursor: z.string().nullable(),
  has_next_page: z.boolean(),
});
