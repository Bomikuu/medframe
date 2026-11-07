import { CheckCircle2, Info, ShieldAlert } from "lucide-react";
import type { WebsiteContent, WebsiteSetup } from "./schema";

/** Review cues only. Native publish revalidates the saved version and public image scope. */
export function PublicationReview({
  content,
  assets,
}: {
  content: WebsiteContent;
  assets: WebsiteSetup["assets"];
}) {
  const visible = content.sections.filter((row) => row.visible);
  const imageIds = [
    content.logo_id,
    content.hero_image_id,
    ...visible.flatMap((row) => [row.image_id, ...row.items.map((item) => item.image_id)]),
  ].filter((id): id is string => !!id);
  const unique = [...new Set(imageIds)];
  const unavailable = unique.filter(
    (id) => !assets.some((asset) => asset.id === id && asset.state === "clean"),
  );
  const checks = [
    {
      label: "Public contact",
      detail:
        content.phone || content.email
          ? [content.phone, content.email].filter(Boolean).join(" · ")
          : "No public phone or email. Add a way for patients to contact the clinic.",
      ready: !!(content.phone || content.email),
    },
    {
      label: "Visible sections",
      detail: visible.length
        ? visible.map((row) => row.title || row.kind).join(" · ")
        : "Only the main page content will appear; no additional sections are visible.",
      ready: visible.length > 0,
    },
    {
      label: "Selected public images",
      detail: unavailable.length
        ? `${unavailable.length} selected image(s) are unavailable or not clean in the current asset list. Recheck Images before publishing.`
        : `${unique.length} unique selected images${unique.length ? " currently marked clean" : ""}. Review image rights and public suitability.`,
      ready: !unavailable.length,
    },
    {
      label: "Search indexing",
      detail: content.indexable
        ? "Search engines may index the published page. Check the title and description."
        : "Search indexing is discouraged; this is not an access restriction on the public page.",
      ready: !!content.seo_title && !!content.seo_description,
    },
    {
      label: "Patient portal link",
      detail: content.portal_cta
        ? "A sign-in link is shown. Publishing does not give visitors patient access."
        : "No patient portal sign-in link is shown.",
      ready: true,
    },
  ];
  return (
    <section
      aria-label="Publication checks"
      className="grid gap-4 rounded-lg bg-muted/40 p-4 text-sm"
    >
      <h3 className="font-semibold">Before this becomes public</h3>
      <ul className="grid gap-3">
        {checks.map((item) => (
          <li key={item.label} className="flex gap-2">
            {item.ready ? (
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-ink" />
            ) : (
              <Info
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-amber-800 dark:text-amber-200"
              />
            )}
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      {visible.some((row) => row.kind === "queue") && (
        <p className="flex gap-2 border-t border-border pt-3 text-xs leading-5">
          <ShieldAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-amber-800 dark:text-amber-200"
          />
          <span>
            A public queue section is visible
            {content.queue_branch_id
              ? " for the selected queue branch"
              : ", but no queue branch is selected"}
            . Review ticket numbers, counters and announcements for public display. Keep names,
            clinical details and private notes out of public copy.
          </span>
        </p>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        These cues do not publish anything or replace the server’s checks. Confirm below only after
        reviewing the saved content and images.
      </p>
    </section>
  );
}
