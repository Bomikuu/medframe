"use client";
import { z } from "zod";
import { RecordAuthorsDocument } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
export function useRecordAuthors(patientId?: string, enabled = true) {
  const { organizationId } = useWorkspace();
  const remote = useRemote(RecordAuthorsDocument, { organizationId, patientId }, { enabled });
  return (
    z
      .array(z.object({ value: z.string(), label: z.string() }))
      .safeParse(remote.data?.recordAuthors).data ?? []
  );
}
