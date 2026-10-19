import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const origin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  const appHost = new URL(origin).hostname;
  let hostname: string;
  try {
    const incoming = new URL(`http://${request.headers.get("host") ?? ""}`);
    if (
      incoming.username ||
      incoming.password ||
      incoming.pathname !== "/" ||
      incoming.search ||
      incoming.hash
    )
      return new NextResponse(null, { status: 404 });
    hostname = incoming.hostname.toLowerCase();
  } catch {
    return new NextResponse(null, { status: 404 });
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-medframe-site-host");
  if ([appHost, "localhost", "127.0.0.1"].includes(hostname))
    return NextResponse.next({ request: { headers: requestHeaders } });
  if (!/^[a-z0-9.-]{3,253}$/.test(hostname)) return new NextResponse(null, { status: 404 });
  try {
    const response = await fetch(
      `${process.env.BACKEND_URL ?? "http://127.0.0.1:8000"}/websites/resolve?hostname=${encodeURIComponent(hostname)}`,
      { cache: "no-store", signal: AbortSignal.timeout(3000) },
    );
    if (!response.ok) return new NextResponse(null, { status: 503 });
    const { slug, indexable } = await response.json();
    if (typeof slug !== "string" || !/^[a-z][a-z0-9-]{1,58}[a-z0-9]$/.test(slug))
      return new NextResponse(null, { status: 404 });
    requestHeaders.set("x-medframe-site-host", hostname);
    if (request.nextUrl.pathname === "/robots.txt")
      return new NextResponse(
        indexable
          ? `User-agent: *\nAllow: /\nSitemap: https://${hostname}/sitemap.xml\n`
          : "User-agent: *\nDisallow: /\n",
        { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } },
      );
    if (request.nextUrl.pathname === "/sitemap.xml")
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${indexable ? `<url><loc>https://${hostname}/</loc></url>` : ""}</urlset>`,
        { headers: { "Content-Type": "application/xml", "Cache-Control": "no-store" } },
      );
    if (
      request.nextUrl.pathname.startsWith(`/clinics/${slug}/assets/`) ||
      request.nextUrl.pathname === `/clinics/${slug}/queue`
    )
      return NextResponse.next({ request: { headers: requestHeaders } });
    if (request.nextUrl.pathname !== "/") return new NextResponse(null, { status: 404 });
    const destination = request.nextUrl.clone();
    destination.pathname = `/clinics/${slug}`;
    return NextResponse.rewrite(destination, { request: { headers: requestHeaders } });
  } catch {
    return new NextResponse("Clinic website unavailable", { status: 503 });
  }
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
