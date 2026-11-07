"use client";

import { RecordUnavailable } from "@/components/application/record-unavailable";
import { useState } from "react";
import { AnatomyChartDocument } from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { PageControls } from "@/features/records/record-filters";
import { LoadState } from "@/features/patients/feedback";
import { anatomyPageSchema } from "./schema";
import { structureLabel } from "./asset-registry";
export function AnatomyReleasePicker({
  patientId,
  revisionId,
  keys,
  onChange,
}: {
  patientId: string;
  revisionId: string;
  keys: string[];
  onChange: (keys: string[]) => void;
}) {
  const { organizationId } = useWorkspace();
  const [after, setAfter] = useState<string>();
  const remote = useRemote(AnatomyChartDocument, {
    organizationId,
    patientId,
    revisionId,
    after,
    first: 20,
  });
  const parsed = anatomyPageSchema.safeParse(remote.data?.anatomyChart);
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  if (!parsed.success)
    return (
      <RecordUnavailable description="Anatomical source could not be read. Contact your clinic administrator if the problem continues." />
    );
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Select each finding to share. {keys.length} selected across pages. Clinical notes require a
        separate opt-in below.
      </p>
      {parsed.data.items.map((value) => (
        <label key={value.key} className="flex min-h-11 items-start gap-3 text-sm">
          <Checkbox
            checked={keys.includes(value.key)}
            onCheckedChange={(checked) =>
              onChange(
                checked === true ? [...keys, value.key] : keys.filter((key) => key !== value.key),
              )
            }
          />
          <span>
            {value.description}
            <span className="mt-1 block text-xs text-muted-foreground">
              {structureLabel(value.structure_id)} · {value.category} · {value.status}
            </span>
          </span>
        </label>
      ))}
      <PageControls after={after} next={parsed.data.end_cursor} onChange={setAfter} />
    </div>
  );
}
