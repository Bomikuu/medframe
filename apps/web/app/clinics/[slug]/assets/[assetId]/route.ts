import { backendUrl } from "@/lib/server/backend-proxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; assetId: string }> },
) {
  const { slug, assetId } = await params;
  if (!/^[a-z][a-z0-9-]{1,58}[a-z0-9]$/.test(slug) || !/^[0-9a-f-]{36}$/.test(assetId))
    return new Response(null, { status: 404 });
  const upstream = await fetch(`${backendUrl}/websites/${slug}/assets/${assetId}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!upstream.ok) return new Response(null, { status: upstream.status === 404 ? 404 : 503 });
  const type = upstream.headers.get("content-type") ?? "";
  if (!["image/png", "image/jpeg", "image/webp"].includes(type))
    return new Response(null, { status: 404 });
  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
