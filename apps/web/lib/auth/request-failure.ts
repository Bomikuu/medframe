import { ClientError } from "graphql-request";
import { ApiError } from "./client";

/** Transport JSON errors are not necessarily GraphQL record/permission errors. */
export function requestFailureCode(error: unknown): string {
  if (error instanceof ApiError) return error.code || "UNAVAILABLE";
  if (!(error instanceof ClientError)) return "UNAVAILABLE";
  const code = error.response.errors?.[0]?.extensions?.code;
  if (typeof code === "string") return code;
  const body = error.response.body;
  if (typeof body === "string") {
    try {
      const value: unknown = JSON.parse(body);
      if (
        value &&
        typeof value === "object" &&
        "code" in value &&
        typeof value.code === "string" &&
        /^[A-Z_]{2,64}$/.test(value.code)
      )
        return value.code;
    } catch {
      // An HTML/network failure has no trusted domain classification.
    }
  }
  if (error.response.status === 401) return "UNAUTHENTICATED";
  if (error.response.status === 403) return "REQUEST_REJECTED";
  if (error.response.status === 429) return "RATE_LIMITED";
  return "UNAVAILABLE";
}

/** Precise copy never relaxes the existing conservative protected-data boundary. */
export function discardRejectedData(error: unknown): boolean {
  if (
    ["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED", "STATION_REQUIRED"].includes(
      requestFailureCode(error),
    )
  )
    return true;
  return (
    (error instanceof ClientError || error instanceof ApiError) &&
    [401, 403].includes(error instanceof ClientError ? error.response.status : error.status)
  );
}
