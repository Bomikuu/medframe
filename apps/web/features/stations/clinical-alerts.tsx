"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ClinicalContextDocument } from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { ClinicalSummary, reviewLabel } from "@/features/patients/clinical-summary";

export function ClinicalAlerts({
  patientId,
  revisionId,
  active,
}: {
  patientId: string;
  revisionId?: string | null;
  active: boolean;
}) {
  const { organizationId } = useWorkspace();
  const remote = useRemote(
    ClinicalContextDocument,
    { organizationId, patientId, revisionId },
    { enabled: active },
  );
  const [open, setOpen] = useState(false);
  const revision = remote.data?.patientClinicalContext;
  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border bg-card px-4 py-2 text-xs sm:px-5">
        <p className="flex min-w-0 items-start gap-2 leading-5">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            {!remote.data ? (
              remote.error ? (
                "Allergy context unavailable — check the patient record"
              ) : (
                "Loading allergy context…"
              )
            ) : revision?.allergies.length ? (
              <>
                <strong>Allergies:</strong>{" "}
                {revision.allergies.map((a) => `${a.substance} (${a.severity})`).join(" · ")}
              </>
            ) : (
              reviewLabel(revision?.allergyState || "unreviewed", "allergy")
            )}
          </span>
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
          Medical alerts & history
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="z-[120] max-h-[85dvh] overflow-y-auto">
          <DialogTitle>Patient medical context</DialogTitle>
          <DialogDescription>
            Recorded history, allergies and current medications. Unreviewed information is not a
            negative finding.
          </DialogDescription>
          <ClinicalSummary revision={revision || null} />
        </DialogContent>
      </Dialog>
    </>
  );
}
