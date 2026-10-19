const allowedPaths = new Set([
  "stations/context",
  "stations/access",
  "stations/doctor",
  "stations/dashboard",
  "stations/portrait",
  "stations/walk-in",
  "stations/pair",
  "stations/manage",
  "stations/encounter",
  "stations/handoff",
  "onboarding/graphql",
  "onboarding/account/prepare",
  "onboarding/account/mfa/enroll",
  "onboarding/account/mfa/verify",
  "onboarding/logo/upload",
  "graphql",
  "portal/graphql",
  "portal/auth/csrf",
  "portal/auth/login",
  "portal/auth/google/prepare",
  "portal/auth/google/login",
  "portal/auth/invitations/prepare",
  "portal/auth/mfa/enroll",
  "portal/auth/mfa/verify",
  "portal/auth/logout",
  "portal/auth/recovery/request",
  "portal/auth/recovery/reset",
  "auth/csrf",
  "auth/login",
  "auth/google/prepare",
  "auth/google/login",
  "auth/mfa/enroll",
  "auth/mfa/verify",
  "auth/logout",
  "auth/recovery/request",
  "auth/recovery/reset",
]);

export const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
export const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

export async function proxyBackend(request: Request, path: string): Promise<Response> {
  const logoUpload = path === "onboarding/logo/upload";
  const logoDownload = /^onboarding\/logo\/[0-9a-f-]{36}\/content$/.test(path);
  const upload = logoUpload || /^(?:diagnostics\/)?documents\/upload\/[0-9a-f-]{36}$/.test(path);
  const download =
    logoDownload ||
    ["documents/download", "portal/documents/download", "diagnostics/documents/download"].includes(
      path,
    );
  const expectedMethod = path.endsWith("auth/csrf") || download ? "GET" : "POST";
  if ((!allowedPaths.has(path) && !upload && !download) || request.method !== expectedMethod) {
    return Response.json({ message: "This endpoint is unavailable." }, { status: 404 });
  }
  if (request.method === "POST" && request.headers.get("origin") !== webOrigin) {
    return Response.json({ message: "Reload the page and try again." }, { status: 403 });
  }
  const headers = new Headers({ origin: webOrigin });
  headers.set("cookie", request.headers.get("cookie") ?? "");
  headers.set(
    "content-type",
    upload ? (request.headers.get("content-type") ?? "") : "application/json",
  );
  headers.set("x-csrf-token", request.headers.get("x-csrf-token") ?? "");
  let body: Uint8Array | undefined;
  if (request.method === "POST") {
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = request.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > (logoUpload ? 2 * 1024 * 1024 + 65536 : upload ? 21 * 1024 * 1024 : 65_536)) {
          await reader.cancel();
          return Response.json({ message: "The request is too large." }, { status: 413 });
        }
        chunks.push(value);
      }
    }
    body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
  }
  try {
    const search = download ? new URL(request.url).search : "";
    const upstream = await fetch(`${backendUrl}/${path}${search}`, {
      method: request.method,
      headers,
      body: body as BodyInit | undefined,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(upload || download ? 60_000 : 15_000),
    });
    const responseHeaders = new Headers({
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    for (const cookie of upstream.headers.getSetCookie()) {
      responseHeaders.append("Set-Cookie", cookie);
    }
    const retry = upstream.headers.get("retry-after");
    if (retry) responseHeaders.set("Retry-After", retry);
    if (download) {
      for (const name of ["content-disposition", "content-security-policy", "referrer-policy"]) {
        const value = upstream.headers.get(name);
        if (value) responseHeaders.set(name, value);
      }
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json(
      { code: "UNAVAILABLE", message: "Medframe is temporarily unavailable. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
