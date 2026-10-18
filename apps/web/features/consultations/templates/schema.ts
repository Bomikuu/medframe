import { z } from "zod";
export const templateSchema = z.object({
  id: z.string(),
  revision_id: z.string(),
  name: z.string(),
  specialty: z.string(),
  version: z.number(),
  active: z.boolean(),
  prompts: z.object({
    subjective: z.string(),
    objective: z.string(),
    assessment: z.string(),
    plan: z.string(),
  }),
  observation_labels: z.array(z.string()),
});
