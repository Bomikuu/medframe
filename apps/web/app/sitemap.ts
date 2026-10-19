import type { MetadataRoute } from "next";
import { backendUrl, webOrigin } from "@/lib/server/backend-proxy";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const response = await fetch(`${backendUrl}/websites/index`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Sitemap unavailable");
  const data: { sites: { slug: string; updated_at: string }[] } = await response.json();
  return data.sites
    .filter((row) => /^[a-z][a-z0-9-]{1,58}[a-z0-9]$/.test(row.slug))
    .map((row) => ({ url: `${webOrigin}/clinics/${row.slug}`, lastModified: row.updated_at }));
}
