import { z } from "zod";

export const itemSchema = z.object({
  title: z.string().max(100),
  description: z.string().max(1000),
  image_id: z.string().nullable(),
});
export const sectionSchema = z.object({
  kind: z.enum(["about", "services", "team", "contact", "queue"]),
  visible: z.boolean(),
  title: z.string().max(120),
  body: z.string().max(4000),
  image_id: z.string().nullable(),
  items: z.array(itemSchema).max(12),
});
export const contentSchema = z.object({
  clinic_name: z.string().min(1).max(160),
  headline: z.string().max(160),
  introduction: z.string().max(1500),
  template: z.enum(["modern", "editorial"]),
  palette: z.enum(["navy", "teal", "forest", "clay"]),
  logo_id: z.string().nullable(),
  hero_image_id: z.string().nullable(),
  phone: z.string().max(40),
  email: z.string().max(160),
  address: z.string().max(500),
  hours: z.string().max(1000),
  portal_cta: z.boolean(),
  seo_title: z.string().max(70),
  seo_description: z.string().max(170),
  indexable: z.boolean(),
  queue_branch_id: z.string().nullable(),
  sections: z.array(sectionSchema).max(5),
});
export const websiteSchema = z.object({
  id: z.string(),
  slug: z.string(),
  version: z.number(),
  content: contentSchema,
  published_number: z.number().nullable(),
  published_content: contentSchema.nullable(),
  history: z.array(z.object({ id: z.string(), number: z.number(), created_at: z.string() })),
  domain: z
    .object({ hostname: z.string(), challenge: z.string(), verified: z.boolean() })
    .nullable(),
});
export const setupSchema = z.object({
  website: websiteSchema.nullable(),
  defaults: contentSchema,
  assets: z.array(z.object({ id: z.string(), label: z.string(), state: z.string() })),
});
export type WebsiteContent = z.infer<typeof contentSchema>;
export type Website = z.infer<typeof websiteSchema>;
export type WebsiteSetup = z.infer<typeof setupSchema>;
export const palettes = {
  navy: { ink: "#153149", wash: "#edf2f6" },
  teal: { ink: "#075c60", wash: "#edf6f3" },
  forest: { ink: "#234f3a", wash: "#f0f4ed" },
  clay: { ink: "#80412e", wash: "#faf2ec" },
};
