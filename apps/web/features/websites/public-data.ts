import "server-only";
import { z } from "zod";
import { contentSchema } from "./schema";
import { backendUrl } from "@/lib/server/backend-proxy";

export const publicWebsiteSchema = z.object({
  slug: z.string(),
  content: contentSchema,
  published_at: z.string(),
  queue: z.array(z.object({ number: z.number(), status: z.string() })),
});
export async function publicWebsite(slug: string) {
  if (!/^[a-z][a-z0-9-]{1,58}[a-z0-9]$/.test(slug)) return null;
  const response = await fetch(`${backendUrl}/websites/${slug}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("The clinic website is temporarily unavailable.");
  return publicWebsiteSchema.parse(await response.json());
}
