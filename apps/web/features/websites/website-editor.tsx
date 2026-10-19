"use client";

import { useState, useCallback } from "react";
import { ClientError } from "graphql-request";
import { useForm, useWatch, type FieldPathValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/form-field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { PageHeading, LoadState, failureText } from "@/features/patients/feedback";
import { FormSelect } from "@/features/patients/form-controls";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { WebsiteSetupDocument, WebsiteActionDocument } from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { UploadControl } from "@/features/documents/upload-control";
import { ClinicSite } from "./site-page";
import { AssetSelect, SectionFields } from "./section-fields";
import {
  contentSchema,
  setupSchema,
  websiteSchema,
  type Website,
  type WebsiteContent,
  type WebsiteSetup,
} from "./schema";

export function WebsiteWorkspace() {
  const { organizationId, can } = useWorkspace();
  const remote = useRemote(
    WebsiteSetupDocument,
    { organizationId },
    { enabled: can("organization.manage") },
  );
  const parsed = setupSchema.safeParse(remote.data?.websiteSetup);
  if (!can("organization.manage"))
    return <p role="alert">Clinic administrator access is required to manage a website.</p>;
  if (!parsed.success)
    return (
      <LoadState
        error={remote.error ?? (remote.data ? new Error("Invalid website response") : null)}
        retry={remote.reload}
        title="Opening the website builder"
        detail="Loading your clinic’s website draft, publication history and approved public images."
      />
    );
  return <WebsiteEditor key={organizationId} initial={parsed.data} reloadAssets={remote.reload} />;
}

function WebsiteEditor({
  initial,
  reloadAssets,
}: {
  initial: WebsiteSetup;
  reloadAssets: () => void;
}) {
  const { organizationId, workspace } = useWorkspace();
  const capture = useRequestScope();
  const [website, setWebsite] = useState<Website | null>(initial.website);
  const [slug, setSlug] = useState(initial.website?.slug ?? "");
  const [savedSlug, setSavedSlug] = useState(initial.website?.slug ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [section, setSection] = useState("hero");
  const [previewWidth, setPreviewWidth] = useState("desktop");
  const [review, setReview] = useState(false);
  const [approved, setApproved] = useState(false);
  const [hostname, setHostname] = useState(initial.website?.domain?.hostname ?? "");
  const form = useForm<WebsiteContent>({
    resolver: zodResolver(contentSchema),
    defaultValues: initial.website?.content ?? initial.defaults,
  });
  const content = useWatch({ control: form.control }) as WebsiteContent;
  const dirty = form.formState.isDirty || slug !== savedSlug;
  const discard = useCallback(() => {
    form.reset(website?.content ?? initial.defaults);
    setSlug(savedSlug);
  }, [form, website, initial.defaults, savedSlug]);
  useUnsavedChanges("clinic-website", dirty, discard);
  async function run(action: string, data: Record<string, unknown> = {}) {
    if (busy) return;
    if (action === "save" && !/^[a-z][a-z0-9-]{1,58}[a-z0-9]$/.test(slug)) {
      setError("Choose a website address with 3–60 lowercase letters, numbers and hyphens.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const current = capture();
    try {
      const value = await getGraphqlClient().request(WebsiteActionDocument, {
        organizationId,
        action,
        data,
        expectedVersion: website?.version ?? 0,
      });
      if (!current()) return;
      const next = websiteSchema.parse(value.websiteAction);
      setWebsite(next);
      setSavedSlug(next.slug);
      setSlug(next.slug);
      if (action === "save" || action === "restore") form.reset(next.content);
      setMessage(
        action === "publish"
          ? "Published. Your reviewed website is now available at its clinic address."
          : action === "unpublish"
            ? "Unpublished. Public pages and images are no longer available."
            : action === "restore"
              ? "Publication restored to your draft. Review and publish separately."
              : action === "domain_verify"
                ? "Domain ownership verified. DNS routing and HTTPS must be configured by your hosting operator."
                : "Changes saved.",
      );
      setReview(false);
      setApproved(false);
    } catch (cause) {
      if (current())
        setError(
          cause instanceof ClientError && cause.response.errors?.[0]?.message
            ? cause.response.errors[0].message
            : failureText(cause),
        );
    } finally {
      if (current()) setBusy(false);
    }
  }
  const update = <K extends keyof WebsiteContent>(
    key: K,
    value: FieldPathValue<WebsiteContent, K>,
  ) => form.setValue(key, value, { shouldDirty: true });
  const active = content.sections.findIndex((row) => row.kind === section);
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        title="Clinic website"
        description="Build a public home for your clinic. Draft changes stay private until you review and publish them."
      >
        {website?.published_number && (
          <ButtonLink variant="outline" href={`/clinics/${website.slug}`} target="_blank">
            Open published website
          </ButtonLink>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void form.handleSubmit((value) => run("save", { slug, content: value }))()}
        >
          Save draft
        </Button>
        <Button
          type="button"
          disabled={busy || dirty || !website}
          onClick={() => {
            setApproved(false);
            setReview(true);
          }}
        >
          Review & publish
        </Button>
      </PageHeading>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p>
          {website?.published_number
            ? `Published · Revision ${website.published_number}`
            : "Not published"}
          <span className="ml-3 text-muted-foreground">
            {busy ? "Saving…" : dirty ? "Unsaved changes" : "Draft is up to date"}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {slug ? `/clinics/${slug}` : "Choose your clinic’s website address"}
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          {error} Your current input is retained.
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg bg-teal-soft p-4 text-sm text-teal-ink">
          {message}
        </p>
      )}
      {Object.keys(form.formState.errors).length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          Review field lengths and required clinic information before saving.
        </p>
      )}
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <fieldset disabled={busy} className="min-w-0 rounded-xl border border-border bg-card p-5">
          <Tabs defaultValue="content">
            <div className="overflow-x-auto">
              <TabsList variant="line" className="min-w-max">
                {["content", "design", "images", "seo", "history", "domain"].map((tab) => (
                  <TabsTrigger key={tab} value={tab} className="capitalize">
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value="content" className="mt-6 grid gap-5">
              <FormField id="site-slug" label="Website address">
                <Input
                  id="site-slug"
                  value={slug}
                  maxLength={60}
                  disabled={!!website?.history.length}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="your-clinic"
                />
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Lowercase letters, numbers and hyphens. This stays fixed after first publication.
                </p>
              </FormField>
              <FormField id="site-name" label="Public clinic name">
                <Input id="site-name" maxLength={160} {...form.register("clinic_name")} />
              </FormField>
              <div
                className="flex flex-wrap gap-2 border-y border-border py-4"
                aria-label="Website sections"
              >
                {["hero", ...content.sections.map((row) => row.kind)].map((kind) => (
                  <Button
                    key={kind}
                    type="button"
                    size="sm"
                    variant={section === kind ? "secondary" : "ghost"}
                    onClick={() => setSection(kind)}
                    className="capitalize"
                  >
                    {kind}
                  </Button>
                ))}
              </div>
              {section === "hero" ? (
                <>
                  <FormField id="site-headline" label="Main headline">
                    <Textarea
                      id="site-headline"
                      maxLength={160}
                      rows={3}
                      {...form.register("headline")}
                    />
                  </FormField>
                  <FormField id="site-intro" label="Introduction">
                    <Textarea
                      id="site-intro"
                      maxLength={1500}
                      rows={5}
                      {...form.register("introduction")}
                    />
                  </FormField>
                  <AssetSelect
                    id="hero-image"
                    label="Hero image"
                    value={content.hero_image_id}
                    onChange={(v) => update("hero_image_id", v)}
                    assets={initial.assets}
                  />
                  <label className="flex items-center justify-between gap-3 text-sm">
                    Patient portal / appointments link
                    <Switch
                      checked={content.portal_cta}
                      onCheckedChange={(v) => update("portal_cta", v)}
                    />
                  </label>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Patients sign in through the existing verified portal. Publishing a website does
                    not grant access to records.
                  </p>
                </>
              ) : active >= 0 ? (
                <SectionFields
                  form={form}
                  index={active}
                  content={content}
                  assets={initial.assets}
                />
              ) : null}
              {section === "contact" && (
                <>
                  {(
                    [
                      ["phone", "Contact number"],
                      ["email", "Contact email"],
                      ["address", "Clinic address"],
                      ["hours", "Opening hours"],
                    ] as const
                  ).map(([key, label]) => (
                    <FormField key={key} id={`site-${key}`} label={label}>
                      {key === "address" || key === "hours" ? (
                        <Textarea
                          id={`site-${key}`}
                          rows={3}
                          maxLength={key === "hours" ? 1000 : 500}
                          {...form.register(key)}
                        />
                      ) : (
                        <Input
                          id={`site-${key}`}
                          type={key === "email" ? "email" : "tel"}
                          maxLength={key === "email" ? 160 : 40}
                          {...form.register(key)}
                        />
                      )}
                    </FormField>
                  ))}
                </>
              )}
              {section === "queue" && (
                <>
                  <FormSelect
                    id="website-queue-branch"
                    label="Public queue branch"
                    value={content.queue_branch_id ?? "none"}
                    onChange={(v) => update("queue_branch_id", v === "none" ? null : v)}
                    options={[
                      { value: "none", label: "No queue branch" },
                      ...workspace.branches.map((b) => ({ value: b.id, label: b.name })),
                    ]}
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Only ticket numbers and service state are shown, never patient names. The
                    section is hidden by default.
                  </p>
                </>
              )}
            </TabsContent>
            <TabsContent value="design" className="mt-6 grid gap-5">
              <FormSelect
                id="website-template"
                label="Template / typography"
                value={content.template}
                onChange={(v) => update("template", v as WebsiteContent["template"])}
                options={[
                  { value: "modern", label: "Modern practice · clean sans serif" },
                  { value: "editorial", label: "Dental practice · editorial serif" },
                ]}
              />
              <FormSelect
                id="website-palette"
                label="Color palette"
                value={content.palette}
                onChange={(v) => update("palette", v as WebsiteContent["palette"])}
                options={["navy", "teal", "forest", "clay"].map((v) => ({ value: v, label: v }))}
              />
              <AssetSelect
                id="website-logo"
                label="Clinic logo"
                value={content.logo_id}
                onChange={(v) => update("logo_id", v)}
                assets={initial.assets}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Website branding is separate from your clinical workspace. Logos retain their
                proportions.
              </p>
            </TabsContent>
            <TabsContent value="images" className="mt-6 grid gap-5">
              <h2 className="font-semibold">Website images</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Upload only images approved for public use. Patient and clinical files cannot be
                selected here. Images become selectable after their security scan.
              </p>
              <UploadControl purpose="website" onUploaded={reloadAssets} />
              <Button type="button" variant="outline" onClick={reloadAssets}>
                Refresh scan status
              </Button>
              <ul className="grid gap-3 text-xs">
                {initial.assets.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3 border-b border-border pb-3">
                    <span>{a.label}</span>
                    <span className="capitalize">{a.state}</span>
                  </li>
                ))}
              </ul>
            </TabsContent>
            <TabsContent value="seo" className="mt-6 grid gap-5">
              <FormField id="seo-title" label="Page title">
                <Input id="seo-title" maxLength={70} {...form.register("seo_title")} />
              </FormField>
              <FormField id="seo-description" label="Search description">
                <Textarea
                  id="seo-description"
                  rows={4}
                  maxLength={170}
                  {...form.register("seo_description")}
                />
              </FormField>
              <label className="flex items-center justify-between gap-3 text-sm">
                Allow search engine indexing
                <Switch
                  checked={content.indexable}
                  onCheckedChange={(v) => update("indexable", v)}
                />
              </label>
              <p className="text-xs leading-5 text-muted-foreground">
                Only published, indexable websites appear in the sitemap. Indexing depends on search
                engines; it is not guaranteed.
              </p>
            </TabsContent>
            <TabsContent value="history" className="mt-6 grid gap-5">
              <h2 className="font-semibold">Publication history</h2>
              <p className="text-xs leading-5 text-muted-foreground">
                Each publication preserves the reviewed content. Restore copies it to your draft; it
                does not change the live website.
              </p>
              {website?.history.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 border-b border-border pb-4"
                >
                  <span className="text-sm">
                    Revision {row.number}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={dirty}
                    onClick={() => void run("restore", { revision_id: row.id })}
                  >
                    Restore to draft
                  </Button>
                </div>
              ))}
              {!website?.history.length && (
                <p className="text-sm text-muted-foreground">No publications yet.</p>
              )}
              {website?.published_number && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={dirty}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Unpublish this website? Public pages and images will become unavailable.",
                      )
                    )
                      void run("unpublish");
                  }}
                >
                  Unpublish website
                </Button>
              )}
            </TabsContent>
            <TabsContent value="domain" className="mt-6 grid gap-5">
              <h2 className="font-semibold">Custom domain</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Your clinic address works without a custom domain. Domain ownership, DNS routing and
                HTTPS are separate steps.
              </p>
              <FormField id="website-hostname" label="Hostname">
                <Input
                  id="website-hostname"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  maxLength={253}
                  placeholder="www.yourclinic.com"
                />
              </FormField>
              <Button
                type="button"
                variant="outline"
                disabled={!website || dirty}
                onClick={() => void run("domain_prepare", { hostname })}
              >
                Create ownership record
              </Button>
              {website?.domain && (
                <div className="grid gap-3 rounded-lg bg-muted p-4 text-xs leading-6">
                  <p>
                    {website.domain.verified
                      ? "Ownership verified · configure hosting and HTTPS"
                      : "Awaiting DNS verification"}
                  </p>
                  <p>TXT record name</p>
                  <code className="break-all">_medframe.{website.domain.hostname}</code>
                  <p>TXT value</p>
                  <code className="break-all select-all">{website.domain.challenge}</code>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={dirty}
                    onClick={() => void run("domain_verify")}
                  >
                    Verify DNS ownership
                  </Button>
                  <p>
                    Ask your hosting operator to route this hostname to Medframe and install HTTPS.
                    This editor does not change DNS or deploy your website.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </fieldset>
        <section
          className="min-w-0 rounded-xl border border-border bg-card"
          aria-label="Website preview"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">
              Draft preview{" "}
              <span className="ml-2 font-normal text-muted-foreground">
                Private · links disabled
              </span>
            </h2>
            <div className="flex gap-2">
              {["desktop", "phone"].map((v) => (
                <Button
                  key={v}
                  type="button"
                  size="sm"
                  variant={previewWidth === v ? "secondary" : "ghost"}
                  className="capitalize"
                  onClick={() => setPreviewWidth(v)}
                >
                  {v}
                </Button>
              ))}
            </div>
          </div>
          <div className="max-h-[80dvh] overflow-auto bg-muted/50 p-3">
            <div
              className={`mx-auto min-w-0 overflow-hidden rounded-lg bg-white ${previewWidth === "phone" ? "max-w-[390px]" : "w-full"}`}
            >
              <ClinicSite content={content} slug={slug} preview />
            </div>
          </div>
        </section>
      </div>
      <AlertDialog open={review} onOpenChange={setReview}>
        <AlertDialogContent>
          <AlertDialogTitle>Publish this clinic website?</AlertDialogTitle>
          <AlertDialogDescription>
            The saved draft, selected images, contact details and public biographies will become
            anonymously readable at /clinics/{slug}. Clinical records remain private.
          </AlertDialogDescription>
          <div className="rounded-lg bg-muted p-4 text-sm">
            <strong>{content.headline || "Add a headline before publication"}</strong>
            <p className="mt-2">
              {content.seo_description || "Add a search description before publication"}
            </p>
          </div>
          <label className="flex items-start gap-3 text-sm leading-6">
            <Checkbox checked={approved} onCheckedChange={(v) => setApproved(v === true)} />I
            reviewed this content and these images and approve them for public release.
          </label>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button
              disabled={!approved || busy}
              onClick={() => void run("publish", { reviewed: true })}
            >
              Publish website
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
