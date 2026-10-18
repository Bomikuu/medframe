"use client";

import { useState } from "react";
import { z } from "zod";
import { ToothHistoryDocument } from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { LoadState, timeLabel } from "@/features/patients/feedback";
import { ButtonLink } from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";
import { findingSchema } from "@/features/consultations/schema";

const historySchema = z.array(
  z.object({
    revision_id: z.string(),
    encounter_id: z.string(),
    version: z.number(),
    created_at: z.string(),
    findings: z.array(findingSchema),
  }),
);

export function ToothHistory({ patientId, tooth }: { patientId: string; tooth: string }) {
  const { organizationId, href } = useWorkspace();
  const [before, setBefore] = useState<string | undefined>();
  const remote = useRemote(ToothHistoryDocument, { organizationId, patientId, tooth, before });
  const parsed = historySchema.safeParse(remote.data?.toothHistory);
  return (
    <details className="mt-5 rounded-lg border border-border p-4">
      <summary className="min-h-11 text-sm font-medium">
        Preserved history for tooth {tooth}
      </summary>
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : parsed.success ? (
        <div className="mt-4 grid gap-4">
          {parsed.data.length ? (
            parsed.data.map((visit) => (
              <div key={visit.revision_id} className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">{timeLabel(visit.created_at)}</p>
                {visit.findings.map((finding) => (
                  <p key={finding.key} className="mt-2 text-sm">
                    {finding.condition} · {finding.surfaces.join(", ") || "Whole tooth"} ·{" "}
                    {finding.status}
                  </p>
                ))}
                <ButtonLink
                  variant="link"
                  href={`${href(`/clinic/consultations/${visit.encounter_id}`)}&revision=${visit.revision_id}`}
                >
                  Open visit revision {visit.version}
                </ButtonLink>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No finalized findings for this tooth.</p>
          )}
          {before && (
            <Button type="button" variant="ghost" onClick={() => setBefore(undefined)}>
              Newest tooth history
            </Button>
          )}
          {parsed.data.length === 20 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setBefore(parsed.data.at(-1)?.revision_id)}
            >
              Older tooth history
            </Button>
          )}
        </div>
      ) : (
        <p role="alert">Tooth history could not be read.</p>
      )}
    </details>
  );
}
