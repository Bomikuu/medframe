import { GraphQLClient } from "graphql-request";
import { getCsrfToken } from "@/lib/auth/client";
export function onboardingClient() {
  return new GraphQLClient(
    new URL("/api/backend/onboarding/graphql", window.location.origin).toString(),
    {
      cache: "no-store",
      requestMiddleware: async (request) => {
        const headers = new Headers(request.headers);
        headers.set("X-CSRF-Token", await getCsrfToken(false, request.signal ?? undefined));
        return { ...request, headers };
      },
    },
  );
}
export function message(error: unknown) {
  if (error instanceof TypeError)
    return "We couldn’t connect. Check your connection and try again. Your entries are still here.";
  if (error && typeof error === "object" && "issues" in error)
    return "The setup response was incomplete. Reload this page to retrieve your saved progress, or contact your platform administrator.";
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { errors?: { message: string }[] } }).response;
    return response?.errors?.[0]?.message ?? "Unable to save. Your entries are still on this page.";
  }
  return error instanceof Error
    ? error.message
    : "Unable to complete this request. Please try again.";
}
export function errorCode(error: unknown) {
  return (error as { response?: { errors?: { extensions?: { code?: string } }[] } })?.response
    ?.errors?.[0]?.extensions?.code;
}
