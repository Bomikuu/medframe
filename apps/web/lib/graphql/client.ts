import { GraphQLClient } from "graphql-request";
import { getCsrfToken, workspaceHeaders } from "@/lib/auth/client";

export function getGraphqlClient(): GraphQLClient {
  const endpoint = new URL("/api/backend/graphql", window.location.origin).toString();
  return new GraphQLClient(endpoint, {
    requestMiddleware: async (request) => {
      const headers = new Headers(request.headers);
      headers.set("X-CSRF-Token", await getCsrfToken(false, request.signal ?? undefined));
      for (const [name, value] of Object.entries(workspaceHeaders())) headers.set(name, value);
      return { ...request, headers };
    },
    cache: "no-store",
  });
}
