"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  PatientDocumentsDocument,
  DocumentDownloadDocument,
  RetryScanDocument,
} from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { LoadState, failureText } from "@/features/patients/feedback";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { UploadControl } from "./upload-control";
import { SecureImage } from "./secure-image";

export function DocumentPanel({
  patientId,
  encounterId,
  readOnly = false,
  attachedIds,
  onAttach,
  purpose = "clinical",
  onUploadPending,
}: {
  patientId?: string;
  encounterId?: string;
  readOnly?: boolean;
  attachedIds?: string[];
  onAttach?: (id: string, attach: boolean) => void;
  purpose?: "clinical" | "avatar" | "logo";
  onUploadPending?: (pending: boolean) => void;
}) {
  const { organizationId, can } = useWorkspace();
  const [before, setBefore] = useState<string | undefined>();
  const [versionTarget, setVersionTarget] = useState<{
    id: string;
    label: string;
    encounterId?: string;
  } | null>(null);
  const remote = useRemote(PatientDocumentsDocument, {
    organizationId,
    patientId,
    purpose,
    before,
    versionIds: attachedIds ?? [],
  });
  const files = remote.data
    ? Array.from(
        new Map(
          [...remote.data.documentVersions, ...remote.data.documents].map((file) => [
            file.id,
            file,
          ]),
        ).values(),
      ).filter((file) => !readOnly || !encounterId || attachedIds?.includes(file.id))
    : [];
  const capture = useRequestScope();
  const [failure, setFailure] = useState<unknown>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const pending = remote.data?.documents.some((file) =>
    ["pending", "unavailable"].includes(file.scanState),
  );
  useEffect(() => {
    if (pending) {
      const interval = window.setInterval(remote.reload, 5000);
      return () => window.clearInterval(interval);
    }
  }, [pending, remote.reload]);
  async function act(id: string, action: "download" | "scan") {
    const isCurrent = capture();
    setBusy(id);
    setFailure(null);
    try {
      if (action === "download") {
        if (purpose !== "clinical") {
          setPreviewId(id);
          return;
        }
        const result = await getGraphqlClient().request(DocumentDownloadDocument, {
          organizationId,
          versionId: id,
        });
        if (isCurrent()) {
          const link = document.createElement("a");
          link.href = `/api/backend/documents/download?ticket=${encodeURIComponent(result.authorizeDocumentDownload)}`;
          link.download = "";
          link.click();
        }
      } else {
        await getGraphqlClient().request(RetryScanDocument, { organizationId, versionId: id });
        if (isCurrent()) remote.reload();
      }
    } catch (error) {
      if (isCurrent()) setFailure(error);
    } finally {
      if (isCurrent()) setBusy(null);
    }
  }
  const allowUpload =
    !readOnly &&
    (purpose === "clinical"
      ? can("documents.write")
      : purpose === "logo"
        ? can("organization.manage")
        : true);
  return (
    <section aria-labelledby={`documentsHeading-${purpose}`} className="grid gap-5">
      <div>
        <h2 id={`documentsHeading-${purpose}`} className="text-xl font-semibold">
          {purpose === "clinical"
            ? "Documents and images"
            : purpose === "avatar"
              ? "Profile image"
              : "Clinic logo"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {purpose === "clinical"
            ? "Private files are scanned before download. Attach exact clean versions to this visit."
            : "Upload an image, wait for its scan, then choose it in appearance settings."}
        </p>
      </div>
      {purpose !== "clinical" && attachedIds?.[0] && (
        <SecureImage
          id={attachedIds[0]}
          avatar={purpose === "avatar"}
          alt={purpose === "avatar" ? "Selected profile image" : "Selected clinic logo"}
          className={purpose === "avatar" ? "size-24" : "h-24 max-w-64"}
        />
      )}
      {previewId && (
        <div className="grid justify-items-start gap-3">
          <SecureImage
            id={previewId}
            avatar={purpose === "avatar"}
            alt="Uploaded image preview"
            className={purpose === "avatar" ? "size-32" : "h-40 max-w-full"}
          />
          <Button type="button" variant="ghost" onClick={() => setPreviewId(null)}>
            Close image preview
          </Button>
        </div>
      )}
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : (
        <div className="grid gap-3">
          {files.length ? (
            files.map((file) => {
              const attached = attachedIds?.includes(file.id);
              const eligible =
                !encounterId || !file.encounterId || file.encounterId === encounterId;
              return (
                <div
                  key={file.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium wrap-anywhere">{file.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Version {file.version} ·{" "}
                      {file.scanState === "clean"
                        ? "Security scan passed"
                        : file.scanState === "unavailable"
                          ? "Scanner unavailable, quarantined"
                          : file.scanState}{" "}
                      · {Math.ceil(file.size / 1024)} KiB
                    </p>
                    <p className="mt-1 text-xs">
                      {attached
                        ? "Attached to this revision"
                        : file.encounterId && file.encounterId !== encounterId
                          ? "Linked to another visit"
                          : "Available patient file"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allowUpload &&
                      file.scanState === "clean" &&
                      (!file.encounterId || file.encounterId === encounterId) && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setVersionTarget({
                              id: file.documentId,
                              label: file.label,
                              encounterId: file.encounterId ?? undefined,
                            })
                          }
                        >
                          Upload new version
                        </Button>
                      )}
                    {file.scanState === "clean" && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy === file.id}
                        onClick={() => void act(file.id, "download")}
                      >
                        {purpose === "clinical" ? "Download" : "Preview image"}
                      </Button>
                    )}
                    {!readOnly && file.scanState === "unavailable" && allowUpload && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy === file.id}
                        onClick={() => void act(file.id, "scan")}
                      >
                        Retry scan
                      </Button>
                    )}
                    {onAttach && !readOnly && eligible && (
                      <Button
                        type="button"
                        variant={attached ? "ghost" : "outline"}
                        disabled={!attached && file.scanState !== "clean"}
                        onClick={() => onAttach(file.id, !attached)}
                      >
                        {attached
                          ? "Remove attachment"
                          : purpose === "clinical"
                            ? "Attach to visit"
                            : "Use image"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
          )}
        </div>
      )}
      {failure !== null && (
        <p role="alert" className="text-sm text-destructive">
          {failureText(failure)}
        </p>
      )}
      {allowUpload && (
        <UploadControl
          key={versionTarget?.id ?? "new"}
          patientId={patientId}
          encounterId={versionTarget?.encounterId ?? encounterId}
          documentId={versionTarget?.id}
          initialLabel={versionTarget?.label}
          onPendingChange={onUploadPending}
          purpose={purpose}
          onUploaded={remote.reload}
        />
      )}
      {versionTarget && (
        <Button type="button" variant="ghost" onClick={() => setVersionTarget(null)}>
          Upload a separate file instead
        </Button>
      )}
      <div className="flex flex-wrap gap-3">
        {before && (
          <Button type="button" variant="outline" onClick={() => setBefore(undefined)}>
            Newest files
          </Button>
        )}
        {remote.data?.documents.length === 20 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setBefore(remote.data?.documents.at(-1)?.id)}
          >
            Older files
          </Button>
        )}
      </div>
      <Button type="button" variant="ghost" onClick={remote.reload}>
        Refresh file status
      </Button>
    </section>
  );
}
