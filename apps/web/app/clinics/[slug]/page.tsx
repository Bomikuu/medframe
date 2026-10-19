import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ClinicSite } from "@/features/websites/site-page";
import { publicWebsite } from "@/features/websites/public-data";
import { webOrigin } from "@/lib/server/backend-proxy";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await publicWebsite(slug);
  if (!site)
    return { title: "Clinic website unavailable", robots: { index: false, follow: false } };
  const host = (await headers()).get("x-medframe-site-host");
  const canonical = host ? `https://${host}/` : `${webOrigin}/clinics/${slug}`;
  return {
    title: site.content.seo_title,
    description: site.content.seo_description,
    alternates: { canonical },
    robots: { index: site.content.indexable, follow: site.content.indexable },
    openGraph: {
      title: site.content.seo_title,
      description: site.content.seo_description,
      url: canonical,
      type: "website",
    },
  };
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const site = await publicWebsite(slug);
  if (!site) notFound();
  const business = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: site.content.clinic_name,
    telephone: site.content.phone || undefined,
    email: site.content.email || undefined,
    address: site.content.address || undefined,
    url: `${webOrigin}/clinics/${slug}`,
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(business).replace(/</g, "\\u003c") }}
      />
      <ClinicSite
        content={site.content}
        slug={slug}
        queue={site.queue}
        portalUrl={`${webOrigin}/portal`}
      />
    </>
  );
}
