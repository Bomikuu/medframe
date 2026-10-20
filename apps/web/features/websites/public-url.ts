import "server-only";
import { headers } from "next/headers";
import { webOrigin } from "@/lib/server/backend-proxy";

/** proxy.ts strips incoming values and sets this header only after host resolution. */
export async function publicClinicUrl(slug: string) {
  const host = (await headers()).get("x-medframe-site-host");
  return host ? `https://${host}/` : `${webOrigin}/clinics/${slug}`;
}
