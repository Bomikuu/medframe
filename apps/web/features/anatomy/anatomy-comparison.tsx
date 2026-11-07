"use client";

import { RecordUnavailable } from "@/components/application/record-unavailable";
import { useState } from "react";
import { z } from "zod";
import { AnatomyComparisonDocument } from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { LoadState } from "@/features/patients/feedback";
import { PageControls } from "@/features/records/record-filters";
import { recordedFindingSchema, type chartStampSchema } from "./schema";
import { structureLabel } from "./asset-registry";
const comparisonSchema = z.object({
  items: z.array(
    z.object({
      key: z.string(),
      kind: z.string(),
      left: recordedFindingSchema.nullable(),
      right: recordedFindingSchema.nullable(),
    }),
  ),
  end_cursor: z.string().nullable(),
  notice: z.string(),
});
export function AnatomyComparison({
  patientId,
  revisions,
}: {
  patientId: string;
  revisions: z.infer<typeof chartStampSchema>[];
}) {
  const [left, setLeft] = useState(revisions[1]?.revision_id ?? revisions[0]?.revision_id ?? "");
  const [right, setRight] = useState(revisions[0]?.revision_id ?? "");
  if (!left || !right) return <p className="text-sm">No anatomical snapshots to compare.</p>;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-4">
        {[
          ["Earlier snapshot", left, setLeft],
          ["Later snapshot", right, setRight],
        ].map(([label, value, change]) => (
          <label key={label as string} className="grid gap-2 text-sm font-medium">
            {label as string}
            <select
              className="h-11 max-w-full rounded-md border border-input bg-background px-3"
              value={value as string}
              onChange={(event) => (change as (value: string) => void)(event.target.value)}
            >
              {revisions.map((item) => (
                <option key={item.id} value={item.revision_id}>
                  Revision {item.version} · {item.created_at.slice(0, 10)} · {item.author}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <ComparisonPage key={`${left}:${right}`} patientId={patientId} left={left} right={right} />
    </div>
  );
}
function ComparisonPage({
  patientId,
  left,
  right,
}: {
  patientId: string;
  left: string;
  right: string;
}) {
  const { organizationId } = useWorkspace();
  const [after, setAfter] = useState<string>();
  const remote = useRemote(AnatomyComparisonDocument, {
    organizationId,
    patientId,
    leftRevisionId: left,
    rightRevisionId: right,
    after,
  });
  const parsed = comparisonSchema.safeParse(remote.data?.anatomyComparison);
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  if (!parsed.success)
    return (
      <RecordUnavailable description="Comparison could not be read. Contact your clinic administrator if the problem continues." />
    );
  return (
    <>
      <p className="text-sm text-muted-foreground">{parsed.data.notice}</p>
      {parsed.data.items.map((item) => (
        <div key={item.key} className="grid gap-3 border-b border-border py-4">
          <p className="font-medium">
            {structureLabel((item.left ?? item.right)!.structure_id)} ·{" "}
            {item.kind.replaceAll("_", " ")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[item.left, item.right].map((value, index) => (
              <div key={index} className="text-sm">
                {value ? (
                  <>
                    <p>
                      {value.description} · {value.status.replaceAll("_", " ")}
                    </p>
                    <p className="mt-2 text-muted-foreground">
                      {value.author} · {value.recorded_at.slice(0, 10)}
                    </p>
                    {value.notes && <p className="mt-2 whitespace-pre-wrap">{value.notes}</p>}
                  </>
                ) : (
                  "Not recorded in this snapshot"
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <PageControls after={after} next={parsed.data.end_cursor} onChange={setAfter} />
    </>
  );
}
