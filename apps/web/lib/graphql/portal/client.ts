import { GraphQLClient } from "graphql-request";
import { getCsrfToken } from "@/lib/auth/client";
export function getPortalClient(): GraphQLClient {
  return new GraphQLClient(
    new URL("/api/backend/portal/graphql", window.location.origin).toString(),
    {
      cache: "no-store",
      requestMiddleware: async (request) => {
        const headers = new Headers(request.headers);
        headers.set("X-CSRF-Token", await getCsrfToken(true, request.signal ?? undefined));
        return { ...request, headers };
      },
    },
  );
}
