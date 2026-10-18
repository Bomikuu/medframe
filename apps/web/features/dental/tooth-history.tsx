"use client";

import { useState } from "react";
import { z } from "zod";
import { ToothEvidenceDocument } from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { LoadState, timeLabel } from "@/features/patients/feedback";
import { ButtonLink } from "@/components/ui/button-link";
import { recordPage } from "@/features/records/schema";
import { PageControls } from "@/features/records/record-filters";
import { findingSchema, procedureSchema } from "@/features/consultations/schema";

const historySchema = recordPage(
  z.object({
    revision_id: z.string(),
    encounter_id: z.string(),
    version: z.number(),
    created_at: z.string(),
    findings: z.array(findingSchema),
    procedures: z.array(procedureSchema),
  }),
);

export function ToothHistory({ patientId, tooth }: { patientId: string; tooth: string }) {
  const { organizationId, href } = useWorkspace();
  const [after, setAfter] = useState<string | undefined>();
  const remote = useRemote(ToothEvidenceDocument, { organizationId, patientId, tooth, after });
  const parsed = historySchema.safeParse(remote.data?.toothEvidence);
  return (
    <details className="mt-5 rounded-lg border border-border p-4">
      <summary className="min-h-11 text-sm font-medium">
        Preserved history for tooth {tooth}
      </summary>
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : parsed.success ? (
        <div className="mt-4 grid gap-4">
          {parsed.data.items.length ? (
            parsed.data.items.map((visit) => (
              <div key={visit.revision_id} className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">{timeLabel(visit.created_at)}</p>
                {visit.findings.map((finding) => (
                  <p key={finding.key} className="mt-2 text-sm">
                    {finding.condition} · {finding.surfaces.join(", ") || "Whole tooth"} ·{" "}
                    {finding.status}
                  </p>
                ))}
                {visit.procedures.map((procedure, index) => (
                  <p key={index} className="mt-2 text-sm">
                    {procedure.description} · {procedure.status.replaceAll("_", " ")} ·{" "}
                    {procedure.surfaces.join(", ") || "Whole tooth"}
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
            <p className="text-sm text-muted-foreground">
              No finalized findings or procedure evidence for this tooth.
            </p>
          )}
          <PageControls after={after} next={parsed.data.end_cursor} onChange={setAfter} />
        </div>
      ) : (
        <p role="alert">Tooth history could not be read.</p>
      )}
    </details>
  );
}
