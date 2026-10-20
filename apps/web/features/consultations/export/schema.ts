import { z } from "zod";

export const exportPreviewSchema = z.object({
  proof: z.string(),
  expires_in: z.number(),
  bytes: z.number(),
  digest: z.string(),
  schema_version: z.string(),
  sections: z.array(z.string()),
  patient: z.object({ id: z.string(), clinic_reference: z.string(), name_at_export: z.string() }),
  revision: z.object({
    id: z.string(),
    encounter_id: z.string(),
    version: z.number(),
    finalized_at: z.string(),
    author_id: z.string(),
    provider_name_at_finalization: z.string(),
  }),
});
