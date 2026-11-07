"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  FileCheck2,
  FileText,
  LoaderCircle,
  Receipt,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/application/empty-state";
import { useClinicTime } from "@/components/application/clinical-locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { NotificationInboxDocument, ReadNotificationsDocument } from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { useWorkspace } from "./workspace-provider";

const schema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      read: z.boolean(),
      created_at: z.string(),
      href: z.string().nullable(),
    }),
  ),
  end_cursor: z.string().nullable(),
  unread_count: z.number(),
});

type Presentation = { title: string; description: string; icon: LucideIcon; tone: string };
const presentations: Record<string, Presentation> = {
  diagnostic_result: {
    title: "Diagnostic result ready",
    description: "A result is ready for clinical review.",
    icon: FileCheck2,
    tone: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  diagnostic_scan: {
    title: "Diagnostic scan updated",
    description: "A diagnostic file’s security scan has been updated.",
    icon: ShieldCheck,
    tone: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  },
  billing_updated: {
    title: "Billing entry recorded",
    description: "A billing record has been updated.",
    icon: Receipt,
    tone: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  encounter_finalized: {
    title: "Consultation finalized",
    description: "The finalized consultation is ready to view.",
    icon: Stethoscope,
    tone: "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  },
  document_clean: {
    title: "Document ready",
    description: "A document has passed its security scan.",
    icon: FileText,
    tone: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  document_infected: {
    title: "Document needs attention",
    description: "A security scan flagged this document. Review its status.",
    icon: ShieldAlert,
    tone: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
  document_unavailable: {
    title: "Document scan unavailable",
    description: "The document’s security scan could not be completed.",
    icon: ShieldAlert,
    tone: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
};
const fallback: Presentation = {
  title: "Clinic update",
  description: "There’s an update from your clinic.",
  icon: Bell,
  tone: "bg-secondary text-secondary-foreground",
};

export function Notifications() {
  const { organizationId } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [after, setAfter] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const remote = useRemote(NotificationInboxDocument, {
    organizationId,
    unread: unreadOnly,
    after,
  });
  const capture = useRequestScope();
  const time = useClinicTime();
  const parsed = schema.safeParse(remote.data?.notificationInbox);
  const unread = parsed.success ? parsed.data.items.filter((item) => !item.read) : [];
  const count = parsed.success ? parsed.data.unread_count : 0;

  async function read(ids: string[]) {
    const current = capture();
    setBusy(true);
    setError(false);
    try {
      await getGraphqlClient().request(ReadNotificationsDocument, { organizationId, ids });
      if (current()) remote.reload();
    } catch {
      if (current()) setError(true);
    } finally {
      if (current()) setBusy(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="relative size-11 shrink-0 rounded-xl text-muted-foreground hover:bg-secondary hover:text-primary data-[state=open]:bg-secondary data-[state=open]:text-primary"
          aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
        >
          <Bell aria-hidden className="size-[19px]" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-teal-ink px-1 text-[11px] font-semibold text-white ring-2 ring-background dark:text-slate-950">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={12}
        collisionPadding={12}
        aria-label="Notifications"
        className="flex max-h-[min(42rem,var(--radix-popover-content-available-height))] w-[30rem] max-w-[min(calc(100vw-1.5rem),var(--radix-popover-content-available-width))] gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-[0_12px_40px_-12px_rgb(15_35_60/0.25)] ring-0"
      >
        <div className="shrink-0 border-b border-border px-5 pt-5 pb-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
              Notifications
              {count > 0 && (
                <span
                  className="rounded-full bg-secondary px-2.5 py-1 text-sm font-semibold text-secondary-foreground"
                  aria-label={`${count} unread`}
                >
                  {count}
                </span>
              )}
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!unread.length || busy || remote.loading}
              onClick={() => void read(unread.map((item) => item.id))}
            >
              <CheckCheck aria-hidden className="size-4" />
              Mark page read
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <label
              htmlFor="unread-notifications"
              className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted-foreground"
            >
              <Switch
                id="unread-notifications"
                checked={unreadOnly}
                onCheckedChange={(value) => {
                  setAfter(null);
                  setUnreadOnly(value);
                }}
              />
              Unread only
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9"
              aria-label="Refresh notifications"
              disabled={remote.loading || busy}
              onClick={remote.reload}
            >
              <RefreshCw aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
        {remote.error || error ? (
          <div
            role="alert"
            className="border-b border-border bg-destructive/5 px-5 py-3 text-sm text-destructive"
          >
            {error
              ? "Could not mark notifications read. Try again."
              : "Notifications could not be refreshed."}
            {!!remote.error && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-1"
                onClick={remote.reload}
              >
                Try again
              </Button>
            )}
          </div>
        ) : null}
        <div className="min-h-0 overflow-y-auto overscroll-contain" aria-busy={remote.loading}>
          {!parsed.success ? (
            <div
              role="status"
              className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground"
            >
              {remote.error ? (
                <ShieldAlert aria-hidden className="size-6" />
              ) : (
                <LoaderCircle aria-hidden className="size-6 motion-safe:animate-spin" />
              )}
              {remote.error
                ? "Your updates are temporarily unavailable."
                : "Loading your clinic updates…"}
            </div>
          ) : parsed.data.items.length ? (
            <ul className="divide-y divide-border">
              {parsed.data.items.map((item) => {
                const presentation = presentations[item.kind] ?? fallback;
                const Icon = presentation.icon;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex gap-3 px-5 py-4 sm:gap-4 sm:px-6",
                      !item.read && "bg-secondary/35",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-11 shrink-0 place-items-center rounded-full",
                        presentation.tone,
                      )}
                    >
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3
                          className={cn(
                            "text-sm leading-6",
                            item.read ? "font-medium" : "font-semibold",
                          )}
                        >
                          {presentation.title}
                        </h3>
                        <span
                          className={cn(
                            "mt-2 size-2 shrink-0 rounded-full",
                            item.read ? "bg-muted-foreground/30" : "bg-teal-ink",
                          )}
                        >
                          <span className="sr-only">{item.read ? "Read" : "Unread"}</span>
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                        {presentation.description}
                      </p>
                      <time
                        dateTime={item.created_at}
                        className="mt-1 block text-xs leading-5 text-muted-foreground"
                      >
                        {time(item.created_at)}
                      </time>
                      {(item.href || !item.read) && (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {item.href && (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={item.href} onClick={() => setOpen(false)}>
                                <ExternalLink aria-hidden className="size-3.5" />
                                Open record
                              </Link>
                            </Button>
                          )}
                          {!item.read && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={busy || remote.loading}
                              className="text-teal-ink hover:bg-secondary hover:text-teal-ink"
                              onClick={() => void read([item.id])}
                            >
                              <Check aria-hidden className="size-3.5" />
                              Mark read
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-5 py-6">
              <EmptyState
                illustration="notifications"
                title={unreadOnly ? "You’re all caught up" : "No notifications yet"}
                description={
                  unreadOnly
                    ? "There are no unread updates in this view."
                    : "Updates from your clinic will appear here."
                }
              />
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 sm:px-6">
          <span className="text-xs text-muted-foreground">
            {after ? "Earlier clinic updates" : "Latest clinic updates"}
          </span>
          <div className="flex gap-1">
            {after && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={remote.loading}
                onClick={() => setAfter(null)}
              >
                <ArrowLeft aria-hidden className="size-4" />
                Newest
              </Button>
            )}
            {parsed.success && parsed.data.end_cursor && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={remote.loading}
                onClick={() => setAfter(parsed.data.end_cursor)}
                className="text-primary"
              >
                Older updates
                <ArrowRight aria-hidden className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
