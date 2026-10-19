import "server-only";

import { cookies } from "next/headers";
import { sessionRouteSchema } from "@/lib/auth/session-route";
import { backendUrl, webOrigin } from "./backend-proxy";

export async function readBrowserSession() {
  const store = await cookies();
  if (!store.has("medframe_django_session") && !store.has("medframe_device")) {
    return { authenticated: false, kind: "anonymous" as const, destination: "/login" };
  }
  try {
    const response = await fetch(`${backendUrl}/auth/session`, {
      headers: { cookie: store.toString(), origin: webOrigin },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const result = sessionRouteSchema.safeParse(await response.json());
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
