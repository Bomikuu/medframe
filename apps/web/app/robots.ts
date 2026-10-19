import type { MetadataRoute } from "next";
import { webOrigin } from "@/lib/server/backend-proxy";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/clinics/",
      disallow: ["/clinic/", "/portal/", "/station/", "/login", "/api/", "/onboarding/", "/auth/"],
    },
    sitemap: `${webOrigin}/sitemap.xml`,
  };
}
