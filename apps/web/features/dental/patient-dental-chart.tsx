"use client";
import { z } from "zod";
import { DentalChartDocument } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState, RemoteNotice } from "@/features/patients/feedback";
import { findingSchema } from "@/features/consultations/schema";
import { EmptyState } from "@/components/application/empty-state";
import { ChartView } from "./chart-view";
export function PatientDentalChart({ patientId }: { patientId: string }) {
  const { organizationId } = useWorkspace();
  const remote = useRemote(DentalChartDocument, { organizationId, patientId });
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  const parsed = z.array(findingSchema).safeParse(remote.data.dentalChart);
  if (!parsed.success) return <p role="alert">The recorded dental chart could not be read.</p>;
  return (
    <div className="grid gap-5 rounded-lg border border-border p-4 sm:p-6">
      <RemoteNotice error={remote.error} retry={remote.reload} />
      {!parsed.data.length && (
        <EmptyState
          title="No finalized findings recorded"
          description="Draft findings stay with their consultation until finalization. An unmarked tooth does not establish a healthy tooth."
        />
      )}
      <ChartView findings={parsed.data} label="Current finalized dental chart" />
    </div>
  );
}
