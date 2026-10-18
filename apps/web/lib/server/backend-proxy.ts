const allowedPaths = new Set([
  "graphql",
  "auth/csrf",
  "auth/login",
  "auth/mfa/enroll",
  "auth/mfa/verify",
  "auth/logout",
  "auth/recovery/request",
  "auth/recovery/reset",
]);

export const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
export const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

export async function proxyBackend(request: Request, path: string): Promise<Response> {
  const expectedMethod = path === "auth/csrf" ? "GET" : "POST";
  if (!allowedPaths.has(path) || request.method !== expectedMethod) {
    return Response.json({ message: "This endpoint is unavailable." }, { status: 404 });
  }
  if (request.method === "POST" && request.headers.get("origin") !== webOrigin) {
    return Response.json({ message: "Reload the page and try again." }, { status: 403 });
  }
  const headers = new Headers({ origin: webOrigin });
  headers.set("cookie", request.headers.get("cookie") ?? "");
  headers.set("content-type", "application/json");
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
        if (size > 16_384) {
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
    const upstream = await fetch(`${backendUrl}/${path}`, {
      method: request.method,
      headers,
      body: body as BodyInit | undefined,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const responseHeaders = new Headers({
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    for (const cookie of upstream.headers.getSetCookie()) {
      responseHeaders.append("Set-Cookie", cookie);
    }
    const retry = upstream.headers.get("retry-after");
    if (retry) responseHeaders.set("Retry-After", retry);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json(
      { code: "UNAVAILABLE", message: "Medframe is temporarily unavailable. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
