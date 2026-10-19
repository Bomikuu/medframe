import { publicWebsite } from "@/features/websites/public-data";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const site = await publicWebsite((await params).slug);
  if (!site) return new Response(null, { status: 404 });
  return Response.json(
    { queue: site.queue },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
