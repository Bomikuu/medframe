"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { usePortal } from "@/features/portal/portal-provider";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { LoadState } from "@/features/patients/feedback";
import { useSafety } from "@/features/workspace/safety-provider";
import { useClinicTime } from "@/components/application/clinical-locale";
import { getPortalClient } from "@/lib/graphql/portal/client";
import {
  MyCommunicationPreferencesDocument,
  MyNotificationsDocument,
  ReadMyNotificationsDocument,
  RevokeMyRemindersDocument,
} from "@/lib/graphql/portal/generated";
import { FinancialNotice, PageNavigation } from "@/features/billing/controls";
import { financialFailure } from "@/features/billing/use-billing";
import { preferenceSchema } from "./schema";

const notifications = z.object({
  items: z.array(
    z.object({ id: z.string(), kind: z.string(), created_at: z.string(), read: z.boolean() }),
  ),
  end_cursor: z.string().nullable(),
});
export function PortalReminders() {
  const { linkId } = usePortal();
  const capture = useRequestScope();
  const { confirm } = useSafety();
  const time = useClinicTime();
  const [after, setAfter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preferences = useRemote(
    MyCommunicationPreferencesDocument,
    { linkId },
    { client: getPortalClient },
  );
  const remote = useRemote(MyNotificationsDocument, { linkId, after }, { client: getPortalClient });
  const parsed = preferenceSchema.safeParse(preferences.data?.myCommunicationPreferences);
  const inbox = notifications.safeParse(remote.data?.myNotifications);
  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-2xl font-semibold">Clinic reminders</h2>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Private reminders from your clinic. Contact the clinic to update your recipient details or
          consent choices.
        </p>
      </div>
      <FinancialNotice error={error} />
      {!parsed.success ? (
        <LoadState error={preferences.error} retry={preferences.reload} />
      ) : (
        <section className="grid gap-4 rounded-xl border border-border p-5">
          <h3 className="font-semibold">Your delivery preferences</h3>
          <p className="text-sm text-muted-foreground">
            SMS {parsed.data.sms_enabled ? "enabled" : "off"} · Private portal{" "}
            {parsed.data.in_app_enabled ? "enabled" : "off"}
          </p>
          {(parsed.data.sms_enabled || parsed.data.in_app_enabled) && (
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              disabled={busy}
              onClick={async () => {
                if (
                  !(await confirm({
                    title: "Stop your clinic reminders?",
                    description:
                      "Pending deliveries to your linked recipient preference will be cancelled. Your clinical records and appointments stay available.",
                    action: "Stop reminders",
                  }))
                )
                  return;
                const current = capture();
                setBusy(true);
                setError("");
                try {
                  await getPortalClient().request(RevokeMyRemindersDocument, {
                    linkId,
                    expectedVersion: parsed.data.version,
                  });
                  if (current()) preferences.reload();
                } catch (failure) {
                  if (current()) setError(financialFailure(failure));
                } finally {
                  if (current()) setBusy(false);
                }
              }}
            >
              Stop my reminders
            </Button>
          )}
        </section>
      )}
      {!inbox.success ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : (
        <>
          {!inbox.data.items.length ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No private reminders have been delivered for this patient connection.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {inbox.data.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className={item.read ? "text-muted-foreground" : "font-semibold"}>
                      {item.kind}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{time(item.created_at)}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Check your appointments or billing statements, or contact the clinic about
                      follow-up care.
                    </p>
                  </div>
                  {!item.read && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={async () => {
                        const current = capture();
                        setBusy(true);
                        setError("");
                        try {
                          await getPortalClient().request(ReadMyNotificationsDocument, {
                            linkId,
                            ids: [item.id],
                          });
                          if (current()) remote.reload();
                        } catch (failure) {
                          if (current()) setError(financialFailure(failure));
                        } finally {
                          if (current()) setBusy(false);
                        }
                      }}
                    >
                      Mark read
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <PageNavigation next={inbox.data.end_cursor} after={after} change={setAfter} />
        </>
      )}
    </div>
  );
}
