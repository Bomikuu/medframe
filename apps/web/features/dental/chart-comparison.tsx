"use client";
import { useClinicTime } from "@/components/application/clinical-locale";
import { useState } from "react";
import { z } from "zod";
import { ChartRevisionsDocument, DentalComparisonDocument } from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { LoadState } from "@/features/patients/feedback";
import { FormSelect } from "@/features/patients/form-controls";
import { PageControls } from "@/features/records/record-filters";
import { recordPage } from "@/features/records/schema";
import { findingSchema } from "@/features/consultations/schema";
import { ChartView } from "./chart-view";
const revisionSchema = z.object({
  revision_id: z.string(),
  version: z.number(),
  created_at: z.string(),
  reason: z.string(),
  author_name: z.string(),
});
export function ChartComparison({ patientId }: { patientId: string }) {
  const timeLabel = useClinicTime();
  const { organizationId } = useWorkspace();
  const [after, setAfter] = useState<string>();
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("current");
  const remote = useRemote(ChartRevisionsDocument, { organizationId, patientId, after });
  const parsed = recordPage(revisionSchema).safeParse(remote.data?.chartRevisions);
  const options = parsed.success
    ? parsed.data.items.map((item) => ({
        value: item.revision_id,
        label: `${item.reason} · v${item.version} · ${timeLabel(item.created_at)}`,
      }))
    : [];
  return (
    <details className="rounded-lg border border-border p-5">
      <summary className="min-h-11 text-xl font-semibold">Compare dental history</summary>
      <p className="mb-4 text-sm text-muted-foreground">
        Compare exact finalized snapshots. An absent finding does not establish healing.
      </p>
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : parsed.success ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              id="chart-left"
              label="Earlier snapshot"
              value={left || "none"}
              onChange={setLeft}
              options={[{ value: "none", label: "Choose a saved revision" }, ...options]}
            />
            <FormSelect
              id="chart-right"
              label="Compare with"
              value={right}
              onChange={setRight}
              options={[{ value: "current", label: "Current finalized chart" }, ...options]}
            />
          </div>
          <PageControls after={after} next={parsed.data.end_cursor} onChange={setAfter} />
          {left && left !== "none" && (
            <Comparison key={`${left}:${right}`} patientId={patientId} left={left} right={right} />
          )}
        </>
      ) : (
        <p role="alert">Chart history could not be read.</p>
      )}
    </details>
  );
}
const comparisonSchema = z.object({
  left: z.object({ findings: z.array(findingSchema) }),
  right: z.object({ findings: z.array(findingSchema) }),
  differences: z.array(z.object({ key: z.string(), tooth: z.string(), kind: z.string() })),
});
function Comparison({
  patientId,
  left,
  right,
}: {
  patientId: string;
  left: string;
  right: string;
}) {
  const { organizationId } = useWorkspace();
  const remote = useRemote(DentalComparisonDocument, {
    organizationId,
    patientId,
    leftRevisionId: left,
    rightRevisionId: right === "current" ? null : right,
  });
  const parsed = comparisonSchema.safeParse(remote.data?.dentalComparison);
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  if (!parsed.success) return <p role="alert">Comparison could not be read.</p>;
  return (
    <div className="mt-6 grid gap-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartView findings={parsed.data.left.findings} label="Earlier snapshot" />
        <ChartView findings={parsed.data.right.findings} label="Comparison snapshot" />
      </div>
      <div>
        <h3 className="font-semibold">Recorded differences</h3>
        {parsed.data.differences.length ? (
          <ul className="mt-3 grid gap-2">
            {parsed.data.differences.map((item) => (
              <li key={item.key} className="text-sm">
                Tooth {item.tooth}: {item.kind.replaceAll("_", " ")}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm">No recorded differences.</p>
        )}
      </div>
    </div>
  );
}
