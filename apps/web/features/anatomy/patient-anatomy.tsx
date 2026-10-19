"use client";
import { useState } from "react";
import { AnatomyChartDocument, AnatomyRevisionsDocument } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState } from "@/features/patients/feedback";
import { PageControls } from "@/features/records/record-filters";
import { Button } from "@/components/ui/button";
import { useClinicTime } from "@/components/application/clinical-locale";
import {
  anatomyPageSchema,
  anatomyRevisionPageSchema,
  anatomyFindingSchema,
  type AnatomyFinding,
} from "./schema";
import { AnatomyView } from "./anatomy-view";
import { AnatomyComparison } from "./anatomy-comparison";
export function PatientAnatomy({
  patientId,
  onCarry,
}: {
  patientId: string;
  onCarry?: (finding: AnatomyFinding) => void;
}) {
  const { organizationId } = useWorkspace();
  const timeLabel = useClinicTime();
  const [revisionId, setRevisionId] = useState("");
  const [after, setAfter] = useState<string>();
  const [historyAfter, setHistoryAfter] = useState<string>();
  const [compare, setCompare] = useState(false);
  const history = useRemote(AnatomyRevisionsDocument, {
    organizationId,
    patientId,
    after: historyAfter,
  });
  const revisions = anatomyRevisionPageSchema.safeParse(history.data?.anatomyRevisions);
  const remote = useRemote(AnatomyChartDocument, {
    organizationId,
    patientId,
    revisionId: revisionId || undefined,
    after,
  });
  const parsed = anatomyPageSchema.safeParse(remote.data?.anatomyChart);
  return (
    <section className="grid gap-5 py-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-2 text-sm font-medium">
          Chart snapshot
          <select
            className="h-11 max-w-full rounded-md border border-input bg-background px-3"
            value={revisionId}
            onChange={(event) => {
              setRevisionId(event.target.value);
              setAfter(undefined);
            }}
          >
            <option value="">Current finalized findings</option>
            {revisions.success &&
              revisions.data.items.map((item) => (
                <option key={item.id} value={item.revision_id}>
                  {timeLabel(item.created_at)} · revision {item.version}
                </option>
              ))}
          </select>
        </label>
        <Button type="button" variant="outline" onClick={() => setCompare(!compare)}>
          {compare ? "Hide comparison" : "Compare snapshots"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            remote.reload();
            history.reload();
          }}
        >
          Refresh anatomy
        </Button>
      </div>
      {revisions.success && (
        <PageControls
          after={historyAfter}
          next={revisions.data.end_cursor}
          onChange={setHistoryAfter}
        />
      )}
      {compare && revisions.success && (
        <AnatomyComparison patientId={patientId} revisions={revisions.data.items} />
      )}
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : parsed.success ? (
        <>
          {parsed.data.chart && (
            <p className="text-sm text-muted-foreground">
              Exact snapshot · revision {parsed.data.chart.version} · {parsed.data.chart.author} ·{" "}
              {timeLabel(parsed.data.chart.created_at)}
            </p>
          )}
          {parsed.data.items.length ? (
            <>
              <AnatomyView findings={parsed.data.items} />
              {onCarry && (
                <div className="grid gap-2">
                  {parsed.data.items.map((value) => (
                    <div
                      key={value.key}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-2 text-sm"
                    >
                      <span>
                        {value.description} · {value.author} · {timeLabel(value.recorded_at)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onCarry(anatomyFindingSchema.parse(value))}
                      >
                        Carry forward: {value.description}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No anatomical findings recorded in this view.
            </p>
          )}
          <PageControls after={after} next={parsed.data.end_cursor} onChange={setAfter} />
          {parsed.data.has_next_page && (
            <p className="text-xs text-muted-foreground">
              More findings are available on the next page; markers show this page only.
            </p>
          )}
        </>
      ) : (
        <p role="alert">The anatomy chart could not be read. Refresh to retry.</p>
      )}
    </section>
  );
}
