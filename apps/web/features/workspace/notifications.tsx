"use client";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { z } from "zod";
import { useState } from "react";
import { Bell } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "./workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { NotificationsDocument, ReadNotificationsDocument } from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";

const schema = z.array(
  z.object({ id: z.string(), kind: z.string(), read: z.boolean(), created_at: z.string() }),
);

export function Notifications() {
  const { organizationId } = useWorkspace();
  const remote = useRemote(NotificationsDocument, { organizationId });
  const capture = useRequestScope();
  const parsed = schema.safeParse(remote.data?.notifications);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const unread = parsed.success ? parsed.data.filter((item) => !item.read) : [];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center gap-2 rounded-lg px-2 text-sm hover:bg-muted"
          aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ""}`}
        >
          <Bell size={18} />
          {unread.length > 0 && <span>{unread.length}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-5">
        <h2 className="font-semibold">Notifications</h2>
        {!parsed.success ? (
          <p className="mt-3 text-sm">
            {remote.error ? "Notifications could not be loaded." : "Loading notifications…"}
          </p>
        ) : parsed.data.length ? (
          <ul className="mt-3 grid max-h-72 gap-3 overflow-y-auto">
            {parsed.data.map((item) => (
              <li key={item.id} className="border-b border-border pb-3 text-sm">
                <span className={item.read ? "text-muted-foreground" : "font-medium"}>
                  {item.kind.replaceAll("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No notifications yet.</p>
        )}
        {unread.length > 0 && (
          <Button
            variant="outline"
            disabled={busy}
            className="mt-4"
            onClick={async () => {
              const isCurrent = capture();
              setBusy(true);
              setError(false);
              try {
                await getGraphqlClient().request(ReadNotificationsDocument, {
                  organizationId,
                  ids: unread.map((item) => item.id),
                });
                if (isCurrent()) remote.reload();
              } catch {
                if (isCurrent()) setError(true);
              } finally {
                if (isCurrent()) setBusy(false);
              }
            }}
          >
            Mark read
          </Button>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            Could not mark notifications read. Try again.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
