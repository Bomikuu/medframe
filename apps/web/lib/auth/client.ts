export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function getCsrfToken(portal = false, signal?: AbortSignal): Promise<string> {
  const response = await fetch(
    portal ? "/api/backend/portal/auth/csrf" : "/api/backend/auth/csrf",
    { cache: "no-store", signal },
  );
  if (!response.ok) {
    throw new ApiError("Could not connect securely. Try again.", "UNAVAILABLE", response.status);
  }
  const data: { csrfToken: string } = await response.json();
  return data.csrfToken;
}

export async function requestWithCsrf<T>(
  path: string,
  body: unknown,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  try {
    const csrfToken = await getCsrfToken(path.startsWith("portal/"), options.signal);
    const response = await fetch(`/api/backend/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: options.signal,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(data.message ?? "Please try again.", data.code, response.status);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Connection lost. Check your connection and try again.", "NETWORK", 0);
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
