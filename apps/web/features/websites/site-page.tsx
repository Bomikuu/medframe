"use client";

import Image from "next/image";
import { PublicQueue } from "./queue-board";
import type { CSSProperties } from "react";
import { SecureImage } from "@/features/documents/secure-image";
import { palettes, type WebsiteContent } from "./schema";

export function ClinicSite({
  content,
  slug,
  preview = false,
  portalUrl = "/portal",
  queue = [],
}: {
  content: WebsiteContent;
  slug: string;
  preview?: boolean;
  portalUrl?: string;
  queue?: { number: number; status: string }[];
}) {
  const colors = palettes[content.palette];
  const image = (id: string | null, alt: string, className: string) =>
    id ? (
      preview ? (
        <SecureImage id={id} alt={alt} className={className} />
      ) : (
        <Image
          unoptimized
          src={`/clinics/${slug}/assets/${id}`}
          alt={alt}
          width={1200}
          height={900}
          className={className}
        />
      )
    ) : null;
  const sections = content.sections.filter(
    (s) =>
      s.visible &&
      (preview ||
        s.body ||
        s.image_id ||
        s.items.some((item) => item.title || item.description) ||
        (s.kind === "contact" &&
          (content.phone || content.email || content.address || content.hours)) ||
        (s.kind === "queue" && content.queue_branch_id)),
  );
  return (
    <div
      className="@container/site min-w-0 bg-white text-[#183039]"
      style={
        {
          "--site-ink": colors.ink,
          "--site-wash": colors.wash,
          fontFamily:
            content.template === "editorial" ? "Georgia, serif" : "var(--font-jakarta), sans-serif",
        } as CSSProperties
      }
    >
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-6 py-7 @min-[640px]/site:px-10">
        <a
          href={preview ? undefined : "#main"}
          className="flex max-w-full items-center gap-3 text-lg font-semibold wrap-anywhere"
        >
          {image(content.logo_id, content.clinic_name, "h-12 w-24 object-contain")}
          {content.clinic_name}
        </a>
        <nav aria-label="Clinic website" className="flex flex-wrap gap-5 text-sm">
          {sections
            .filter((s) => s.kind !== "queue")
            .map((s) => (
              <a
                key={s.kind}
                href={preview ? undefined : `#${s.kind}`}
                className="underline-offset-4 hover:underline"
              >
                {s.title || s.kind}
              </a>
            ))}
        </nav>
      </header>
      <main id={preview ? "website-preview-main" : "main"}>
        <section className="bg-[var(--site-wash)]">
          <div
            className={`mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 @min-[640px]/site:px-10 @min-[640px]/site:py-24 ${content.hero_image_id ? "@min-[1024px]/site:grid-cols-2" : ""}`}
          >
            <div className="max-w-3xl">
              <h1 className="[font-family:inherit] text-[clamp(2.25rem,6cqi,4.5rem)]! leading-[1.12] font-medium text-[var(--site-ink)]">
                {content.headline || content.clinic_name}
              </h1>
              {content.introduction && (
                <p className="mt-7 max-w-xl text-base leading-8 whitespace-pre-line">
                  {content.introduction}
                </p>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                {content.portal_cta && (
                  <a
                    href={preview ? undefined : portalUrl}
                    aria-disabled={preview}
                    className="rounded-full bg-[var(--site-ink)] px-6 py-3.5 font-sans text-sm font-semibold text-white"
                  >
                    Appointments & patient portal
                  </a>
                )}
                {content.phone && (
                  <a
                    href={preview ? undefined : `tel:${content.phone.replace(/[^+0-9]/g, "")}`}
                    className="rounded-full border border-[var(--site-ink)] px-6 py-3.5 font-sans text-sm font-semibold"
                  >
                    Call the clinic
                  </a>
                )}
              </div>
            </div>
            {image(
              content.hero_image_id,
              "Clinic introduction image",
              "max-h-[520px] w-full rounded-2xl object-contain",
            )}
          </div>
        </section>
        {sections.map((section) => (
          <section
            key={section.kind}
            id={section.kind}
            className="mx-auto max-w-6xl border-b border-black/10 px-6 py-14 @min-[640px]/site:px-10 @min-[640px]/site:py-20"
          >
            <h2 className="text-3xl font-medium text-[var(--site-ink)]">
              {section.title || section.kind}
            </h2>
            {preview &&
              !section.body &&
              !section.image_id &&
              !section.items.length &&
              !["contact", "queue"].includes(section.kind) && (
                <p className="mt-5 text-sm leading-6 opacity-70">
                  Add content in the editor. Empty sections stay hidden on the published website.
                </p>
              )}
            {section.body && (
              <p className="mt-6 max-w-2xl text-base leading-8 whitespace-pre-line">
                {section.body}
              </p>
            )}
            {image(
              section.image_id,
              section.title,
              "mt-8 max-h-96 w-full rounded-xl object-contain",
            )}
            {!!section.items.length && (
              <div className="mt-8 grid gap-x-10 gap-y-8 @min-[640px]/site:grid-cols-2 @min-[1024px]/site:grid-cols-3">
                {section.items.map((item, i) => (
                  <div key={i} className="min-w-0 border-t border-black/15 pt-6">
                    {image(
                      item.image_id,
                      item.title,
                      section.kind === "team"
                        ? "mb-5 size-24 rounded-full object-cover"
                        : "mb-5 h-44 w-full object-contain",
                    )}
                    <h3 className="text-xl font-medium wrap-anywhere">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 wrap-anywhere whitespace-pre-line">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {section.kind === "contact" && (
              <dl className="mt-8 grid gap-7 text-sm leading-7 @min-[640px]/site:grid-cols-2">
                {[
                  ["Find us", content.address],
                  ["Opening hours", content.hours],
                  ["Phone", content.phone],
                  ["Email", content.email],
                ]
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt className="font-sans font-semibold">{label}</dt>
                      <dd className="mt-2 wrap-anywhere whitespace-pre-line">{value}</dd>
                    </div>
                  ))}
              </dl>
            )}
            {section.kind === "queue" && (
              <PublicQueue slug={slug} initial={queue} preview={preview} />
            )}
          </section>
        ))}
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-6 py-8 text-xs leading-6 @min-[640px]/site:px-10">
        <span>{content.clinic_name}</span>
        <span>Clinic website powered by Medframe</span>
      </footer>
    </div>
  );
}
