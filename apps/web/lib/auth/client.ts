/** Context can restrict a native staff request; it never authorizes one. */
export function workspaceHeaders(): Record<string, string> {
  if (
    typeof window !== "undefined" &&
    (window.location.pathname === "/station" || window.location.pathname.startsWith("/station/"))
  ) {
    return { "X-Medframe-Workspace": "station" };
  }
  return {};
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}

let csrfRequest: Promise<string> | null = null;

async function loadCsrfToken(portal: boolean): Promise<string> {
  const response = await fetch(
    portal ? "/api/backend/portal/auth/csrf" : "/api/backend/auth/csrf",
    { cache: "no-store", signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok) {
    throw new ApiError("Could not connect securely. Try again.", "UNAVAILABLE", response.status);
  }
  const data: { csrfToken?: unknown } = await response.json();
  if (typeof data.csrfToken !== "string" || !/^[A-Za-z0-9]{64}$/.test(data.csrfToken)) {
    throw new ApiError(
      "The secure connection check was incomplete. Try again.",
      "INVALID_RESPONSE",
      502,
    );
  }
  return data.csrfToken;
}

/** Only share the pending GET. Settled tokens are never retained or used to replay writes. */
export function getCsrfToken(portal = false, signal?: AbortSignal): Promise<string> {
  if (signal?.aborted) return Promise.reject(signal.reason);
  if (!csrfRequest) {
    const pending = loadCsrfToken(portal).catch((error: unknown) => {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        "We couldn’t check the secure connection. Try again.",
        "SECURITY_CHECK_UNAVAILABLE",
        503,
      );
    });
    csrfRequest = pending;
    const clear = () => {
      if (csrfRequest === pending) csrfRequest = null;
    };
    void pending.then(clear, clear);
  }
  const pending = csrfRequest;
  if (!signal) return pending;
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    void pending.then(
      (token) => {
        signal.removeEventListener("abort", abort);
        if (!signal.aborted) resolve(token);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
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
      headers: {
        ...workspaceHeaders(),
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
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
