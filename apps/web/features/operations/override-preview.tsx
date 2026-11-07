"use client";

import { useState } from "react";
import { z } from "zod";
import { Eye, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { RemoteNotice } from "@/features/patients/feedback";
import { ScheduleOverridePreviewDocument } from "@/lib/graphql/generated";

const previewSchema = z.object({
  timezone: z.string(),
  truncated: z.boolean(),
  rows: z.array(
    z.object({
      provider: z.string(),
      current: z.array(z.string()),
      proposed: z.array(z.string()),
      reservations: z.number(),
      conflicts: z.number(),
    }),
  ),
});

export function OverridePreview({ data }: { data: Record<string, unknown> }) {
  const { organizationId } = useWorkspace();
  const [requested, setRequested] = useState<string | null>(null);
  const key = JSON.stringify(data);
  const enabled = requested === key;
  const remote = useRemote(
    ScheduleOverridePreviewDocument,
    { organizationId, data },
    { enabled, refreshOnFocus: false },
  );
  const parsed = enabled ? previewSchema.safeParse(remote.data?.scheduleOverridePreview) : null;
  return (
    <section
      aria-label="Schedule override impact"
      className="grid gap-3 rounded-lg bg-muted/40 p-4 text-sm sm:col-span-2"
    >
      <h3 className="flex items-center gap-2 font-semibold">
        <ShieldCheck aria-hidden className="size-4 text-teal-ink" />
        Before you save
      </h3>
      <p className="text-xs leading-5 text-muted-foreground">
        A branch or provider closure takes priority. Otherwise, provider date hours replace branch
        date hours, then weekly hours apply. Existing bookings are never moved automatically.
      </p>
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        aria-disabled={enabled && remote.loading}
        onClick={() => {
          if (enabled && remote.loading) return;
          if (enabled) remote.reload();
          else setRequested(key);
        }}
      >
        <Eye aria-hidden />
        {enabled && remote.loading ? "Checking impact…" : "Preview hours & booking impact"}
      </Button>
      {enabled && <RemoteNotice error={remote.error} retry={remote.reload} />}
      {parsed?.success && (
        <div className="grid gap-3">
          {!parsed.data.rows.length && <p>No active providers in this scope.</p>}
          {parsed.data.rows.map((row, index) => (
            <div key={index} className="grid gap-2 border-t border-border pt-3">
              <p className="font-medium">{row.provider}</p>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Saved hours</dt>
                  <dd className="mt-1">{row.current.join(", ") || "No hours"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">After this override</dt>
                  <dd className="mt-1">{row.proposed.join(", ") || "Closed / no hours"}</dd>
                </div>
              </dl>
              <p
                className={
                  row.conflicts
                    ? "text-xs font-medium text-destructive"
                    : "text-xs text-muted-foreground"
                }
              >
                {row.reservations} future reservations on this date ·{" "}
                {row.conflicts
                  ? `${row.conflicts} would lose coverage; reschedule before saving.`
                  : "None lose coverage in this preview."}
              </p>
            </div>
          ))}
          {parsed.data.truncated && (
            <p className="text-xs">
              First 100 providers shown. Select one provider for a complete individual preview.
            </p>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            {parsed.data.timezone} · Read-only snapshot. Save rechecks all reservations and rejects
            conflicts; availability is not a reserved slot.
          </p>
        </div>
      )}
      {enabled && remote.data && !parsed?.success && (
        <p role="alert">The preview could not be read. Retry before relying on it.</p>
      )}
    </section>
  );
}
