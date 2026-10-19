"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/application/status-badge";
import { DocumentRecordsDocument } from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { failureText } from "@/features/patients/feedback";
import { recordPage } from "@/features/records/schema";
import { fileSize, uploadedDate } from "./document-collection";

const versionSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  version: z.number(),
  created_at: z.string(),
  size: z.number(),
  scan_state: z.string(),
});
export function DocumentHistory({
  documentId,
  patientId,
  label,
  onClose,
}: {
  documentId: string;
  patientId: string;
  label: string;
  onClose: () => void;
}) {
  const { organizationId, workspace } = useWorkspace();
  const capture = useRequestScope();
  const [versions, setVersions] = useState<z.infer<typeof versionSchema>[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const fetchPage = useCallback(
    async (after?: string) => {
      const result = await getGraphqlClient().request(DocumentRecordsDocument, {
        organizationId,
        patientId,
        filters: { query: label },
        after,
      });
      return recordPage(versionSchema).parse(result.documentRecords);
    },
    [organizationId, patientId, label],
  );
  const acceptPage = useCallback(
    (page: { items: z.infer<typeof versionSchema>[]; end_cursor: string | null }) => {
      setVersions((previous) =>
        Array.from(
          new Map(
            [...previous, ...page.items.filter((item) => item.document_id === documentId)].map(
              (item) => [item.id, item],
            ),
          ).values(),
        ),
      );
      setNext(page.end_cursor);
    },
    [documentId],
  );
  const load = useCallback(
    async (after?: string) => {
      const current = capture();
      setBusy(true);
      setError(null);
      try {
        const page = await fetchPage(after);
        if (current()) acceptPage(page);
      } catch (failure) {
        if (current()) setError(failure);
      } finally {
        if (current()) setBusy(false);
      }
    },
    [capture, fetchPage, acceptPage],
  );
  useEffect(() => {
    let active = true;
    const current = capture();
    void fetchPage()
      .then((page) => {
        if (active && current()) acceptPage(page);
      })
      .catch((failure) => {
        if (active && current()) setError(failure);
      })
      .finally(() => {
        if (active && current()) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [capture, fetchPage, acceptPage]);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            {label}. Upload dates are shown in {workspace.organization.timezone}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {versions.map((version) => (
            <div
              key={version.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/70 p-4"
            >
              <div>
                <p className="font-semibold">Version {version.version}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {uploadedDate(version.created_at, workspace.organization.timezone)} ·{" "}
                  {fileSize(version.size)}
                </p>
              </div>
              <StatusBadge value={version.scan_state} />
            </div>
          ))}
          {busy && (
            <p role="status" className="text-sm text-muted-foreground">
              Loading version history…
            </p>
          )}
          {error !== null && (
            <p role="alert" className="text-sm text-destructive">
              {failureText(error)}
            </p>
          )}
          {!busy && !versions.length && (
            <p className="text-sm text-muted-foreground">No versions in this page of results.</p>
          )}
          {next && (
            <Button type="button" variant="outline" disabled={busy} onClick={() => void load(next)}>
              Load older versions
            </Button>
          )}
          {error !== null && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void load(next ?? undefined)}
            >
              Retry
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
