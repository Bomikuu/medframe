import { proxyBackend } from "@/lib/server/backend-proxy";

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: RouteParams) {
  const { path } = await context.params;
  return proxyBackend(request, path.join("/"));
}

export async function POST(request: Request, context: RouteParams) {
  const { path } = await context.params;
  return proxyBackend(request, path.join("/"));
}
