"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Bell } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useClinicTime } from "@/components/application/clinical-locale";
import { useWorkspace } from "./workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { NotificationInboxDocument, ReadNotificationsDocument } from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";

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
const titles: Record<string, string> = {
  billing_updated: "Billing entry recorded",
  encounter_finalized: "Consultation finalized",
  document_clean: "Document ready",
  document_infected: "Document scan needs attention",
  document_unavailable: "Document scan unavailable",
};
export function Notifications() {
  const { organizationId } = useWorkspace();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [after, setAfter] = useState<string | null>(null);
  const remote = useRemote(NotificationInboxDocument, {
    organizationId,
    unread: unreadOnly,
    after,
  });
  const capture = useRequestScope();
  const time = useClinicTime();
  const parsed = schema.safeParse(remote.data?.notificationInbox);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
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
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="relative flex size-11 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground hover:bg-secondary hover:text-primary"
          aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
        >
          <Bell size={18} />
          {count > 0 && (
            <span className="absolute top-0 right-0 grid h-5 min-w-5 place-items-center rounded-full bg-teal-ink px-1 text-xs font-semibold text-card">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-5">
        <h2 className="font-semibold">Notifications</h2>
        <label
          htmlFor="unread-notifications"
          className="my-3 flex min-h-11 items-center gap-3 text-sm"
        >
          <Checkbox
            id="unread-notifications"
            checked={unreadOnly}
            onCheckedChange={(value) => {
              setAfter(null);
              setUnreadOnly(value === true);
            }}
          />
          Unread only
        </label>
        {!parsed.success ? (
          <p className="text-sm">
            {remote.error ? "Notifications could not be loaded." : "Loading notifications…"}
          </p>
        ) : parsed.data.items.length ? (
          <ul className="grid max-h-80 gap-4 overflow-y-auto">
            {parsed.data.items.map((item) => (
              <li key={item.id} className="grid gap-2 border-b border-border pb-4 text-sm">
                <p className={item.read ? "text-muted-foreground" : "font-medium"}>
                  {titles[item.kind] ?? item.kind.replaceAll("_", " ")}
                </p>
                <time dateTime={item.created_at} className="text-xs text-muted-foreground">
                  {time(item.created_at)}
                </time>
                <div className="flex flex-wrap items-center gap-3">
                  {item.href && (
                    <Link
                      href={item.href}
                      className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
                    >
                      Open record
                    </Link>
                  )}
                  {!item.read && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void read([item.id])}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No notifications in this view.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {unread.length > 0 && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void read(unread.map((item) => item.id))}
            >
              Mark this page read
            </Button>
          )}
          {after && (
            <Button variant="outline" onClick={() => setAfter(null)}>
              Newest
            </Button>
          )}
          {parsed.success && parsed.data.end_cursor && (
            <Button variant="outline" onClick={() => setAfter(parsed.data.end_cursor)}>
              Older
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            Could not mark notifications read. Try again.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
