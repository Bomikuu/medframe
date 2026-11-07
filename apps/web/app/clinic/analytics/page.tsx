import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const organization = typeof params.organization === "string" ? params.organization : undefined;
  redirect(organization ? `/clinic?organization=${encodeURIComponent(organization)}` : "/clinic");
}
