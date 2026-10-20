"use client";
import { usePatientRecordReadOnly } from "@/features/patients/profile/patient-record-browse";

import { EntrySheet } from "@/components/application/entry-sheet";
import { useEffect, useState } from "react";
import { MoreHorizontal, Upload, History, RefreshCw, Camera, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/application/empty-state";
import { ViewSwitcher } from "@/components/application/view-switcher";
import { DocumentCollection, type DocumentFile } from "./document-collection";
import { DocumentHistory } from "./document-history";
import { Button } from "@/components/ui/button";
import {
  PatientDocumentsDocument,
  DocumentRecordsDocument,
  DocumentDownloadDocument,
  RetryScanDocument,
} from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { LoadState, failureText } from "@/features/patients/feedback";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { UploadControl } from "./upload-control";
import { useRecordAuthors } from "@/features/records/use-record-authors";
import { z } from "zod";
import { recordPage } from "@/features/records/schema";
import {
  RecordFilterForm,
  PageControls,
  type RecordFilters,
} from "@/features/records/record-filters";
import { DocumentPreview } from "./document-preview";
import { SecureImage } from "./secure-image";

export function DocumentPanel({
  patientId,
  encounterId,
  readOnly: requestedReadOnly = false,
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
  const { organizationId, can, workspace } = useWorkspace();
  const browseOnly = usePatientRecordReadOnly();
  const readOnly = requestedReadOnly || browseOnly;
  const [before, setBefore] = useState<string | undefined>();
  const [versionTarget, setVersionTarget] = useState<{
    id: string;
    label: string;
    encounterId?: string;
  } | null>(null);
  const archive = purpose === "clinical" && !!patientId && !encounterId;
  const [uploadOpen, setUploadOpen] = useState(false);
  const [view, setView] = useState<"table" | "cards">(archive ? "table" : "cards");
  const [history, setHistory] = useState<{ id: string; label: string } | null>(null);
  const authors = useRecordAuthors(patientId, archive);
  const [filters, setFilters] = useState<RecordFilters>({});
  const [after, setAfter] = useState<string>();
  const filtered = useRemote(
    DocumentRecordsDocument,
    { organizationId, patientId: patientId ?? "", filters, after },
    { enabled: archive },
  );
  const parsed = recordPage(
    z.object({
      id: z.string(),
      document_id: z.string(),
      label: z.string(),
      version: z.number(),
      content_type: z.string(),
      size: z.number(),
      scan_state: z.string(),
      created_at: z.string(),
      uploaded_by: z.string().optional(),
      encounter_id: z.string().nullable(),
    }),
  ).safeParse(filtered.data?.documentRecords);
  const original = useRemote(
    PatientDocumentsDocument,
    {
      organizationId,
      patientId,
      purpose,
      before,
      versionIds: attachedIds ?? [],
    },
    { enabled: !archive },
  );
  const remote = archive
    ? {
        data: parsed.success
          ? {
              documentVersions: [],
              documents: parsed.data.items.map((item) => ({
                ...item,
                documentId: item.document_id,
                encounterId: item.encounter_id,
                contentType: item.content_type,
                scanState: item.scan_state,
                createdAt: item.created_at,
                uploadedBy: item.uploaded_by,
              })),
            }
          : null,
        error: filtered.error,
        reload: filtered.reload,
      }
    : original;
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
  const uploadPanel = allowUpload ? (
    <EntrySheet
      open={uploadOpen}
      onOpenChange={setUploadOpen}
      triggerVariant="default"
      draftKeys={[
        `${organizationId}:${patientId ?? purpose}:${versionTarget?.encounterId ?? encounterId ?? "general"}:upload`,
      ]}
      title={
        purpose === "avatar"
          ? "Update profile image"
          : purpose === "logo"
            ? "Update clinic logo"
            : "Upload document"
      }
      description={
        versionTarget
          ? `Upload a new version of ${versionTarget.label}. Existing versions are preserved.`
          : "Select a file and wait for its security scan before attaching it."
      }
    >
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
    </EntrySheet>
  ) : null;
  if (purpose !== "clinical") {
    const currentImage = previewId ?? attachedIds?.[0];
    return (
      <section aria-labelledby={`documentsHeading-${purpose}`} className="grid min-w-0 gap-5">
        <div className="flex flex-wrap items-center gap-5 rounded-xl border border-border bg-card p-5">
          {currentImage ? (
            <SecureImage
              id={currentImage}
              avatar={purpose === "avatar"}
              alt={purpose === "avatar" ? "Your profile image" : "Clinic logo"}
              className={purpose === "avatar" ? "size-24" : "h-20 max-w-32 object-contain"}
            />
          ) : (
            <span
              className={`grid size-24 shrink-0 place-items-center bg-teal-soft text-teal-ink ${purpose === "avatar" ? "rounded-full" : "rounded-xl"}`}
            >
              {purpose === "avatar" ? (
                <Camera className="size-8" />
              ) : (
                <Building2 className="size-8" />
              )}
            </span>
          )}
          <div className="min-w-0 flex-1 basis-52">
            <h2 id={`documentsHeading-${purpose}`} className="text-xl font-semibold">
              {purpose === "avatar" ? "Profile image" : "Clinic logo"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {purpose === "avatar"
                ? "Choose a clear portrait for your account. Your photo becomes available after its security scan."
                : "Keep your clinic recognizable. Logos retain their original proportions."}
            </p>
            <div className="mt-4">{uploadPanel}</div>
          </div>
        </div>
        {!remote.data ? (
          <LoadState error={remote.error} retry={remote.reload} />
        ) : (
          files.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
                >
                  {file.scanState === "clean" && (
                    <SecureImage
                      id={file.id}
                      avatar={purpose === "avatar"}
                      alt={file.label}
                      className={purpose === "avatar" ? "size-14" : "h-14 max-w-24 object-contain"}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium wrap-anywhere">{file.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {file.scanState === "clean"
                        ? "Ready to use"
                        : file.scanState.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">{renderActions(file)}</div>
                </li>
              ))}
            </ul>
          )
        )}
        {previewId && (
          <Button
            type="button"
            variant="ghost"
            className="w-fit"
            onClick={() => setPreviewId(null)}
          >
            Close image preview
          </Button>
        )}
        {failure !== null && (
          <p role="alert" className="text-sm text-destructive">
            {failureText(failure)}
          </p>
        )}
        <Button type="button" variant="ghost" className="w-fit" onClick={remote.reload}>
          <RefreshCw />
          Refresh image status
        </Button>
      </section>
    );
  }
  function renderActions(file: DocumentFile) {
    const attached = attachedIds?.includes(file.id);
    const eligible = !encounterId || !file.encounterId || file.encounterId === encounterId;
    const canVersion =
      allowUpload &&
      file.scanState === "clean" &&
      (!file.encounterId || file.encounterId === encounterId);
    return (
      <>
        {file.scanState === "clean" && purpose === "clinical" && (
          <DocumentPreview
            label={file.label}
            contentType={file.contentType}
            authorize={async () => {
              const result = await getGraphqlClient().request(DocumentDownloadDocument, {
                organizationId,
                versionId: file.id,
              });
              return `/api/backend/documents/download?ticket=${encodeURIComponent(result.authorizeDocumentDownload)}`;
            }}
          />
        )}
        {file.scanState === "clean" && purpose !== "clinical" && (
          <Button
            type="button"
            variant="outline"
            disabled={busy === file.id}
            onClick={() => void act(file.id, "download")}
          >
            Preview image
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
        {(canVersion ||
          archive ||
          (!readOnly && file.scanState === "unavailable" && allowUpload)) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={busy === file.id}
                aria-label={`Actions for ${file.label}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canVersion && (
                <DropdownMenuItem
                  onSelect={() => {
                    setVersionTarget({
                      id: file.documentId,
                      label: file.label,
                      encounterId: file.encounterId ?? undefined,
                    });
                    setUploadOpen(true);
                  }}
                >
                  <Upload />
                  Upload new version
                </DropdownMenuItem>
              )}
              {archive && (
                <DropdownMenuItem
                  onSelect={() => setHistory({ id: file.documentId, label: file.label })}
                >
                  <History />
                  View history
                </DropdownMenuItem>
              )}
              {!readOnly && file.scanState === "unavailable" && allowUpload && (
                <DropdownMenuItem onSelect={() => void act(file.id, "scan")}>
                  <RefreshCw />
                  Retry scan
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </>
    );
  }
  return (
    <section
      aria-labelledby={`documentsHeading-${purpose}`}
      className="@container grid min-w-0 gap-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-64">
          <h2 id={`documentsHeading-${purpose}`} className="text-xl font-semibold">
            Documents & imaging
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Private files, imaging and exact document versions for this patient.
          </p>
        </div>
        {uploadPanel}
      </div>
      {archive && (
        <RecordFilterForm
          authors={authors}
          statuses={["uploading", "pending", "unavailable", "clean", "rejected"]}
          types={["image", "pdf"]}
          onApply={(values) => {
            setFilters(values);
            setAfter(undefined);
          }}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {files.length} file version{files.length === 1 ? "" : "s"} in these results · Scanned
          before preview or download
        </p>
        <ViewSwitcher value={view} onChange={setView} />
      </div>
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : files.length ? (
        <DocumentCollection
          files={files}
          view={view}
          timezone={workspace.organization.timezone}
          renderActions={renderActions}
          attachedIds={attachedIds}
        />
      ) : (
        <EmptyState
          title="No documents in these results"
          description="Upload a document or adjust the filters. Only files you are authorized to access appear here."
        />
      )}
      {failure !== null && (
        <p role="alert" className="text-sm text-destructive">
          {failureText(failure)}
        </p>
      )}
      {archive && parsed.success && (
        <PageControls after={after} next={parsed.data.end_cursor} onChange={setAfter} />
      )}
      {versionTarget && (
        <Button
          type="button"
          variant="ghost"
          className="w-fit"
          onClick={() => setVersionTarget(null)}
        >
          Upload a separate file instead
        </Button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex gap-2">
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
          <RefreshCw />
          Refresh file status
        </Button>
      </div>
      {history && patientId && (
        <DocumentHistory
          key={history.id}
          documentId={history.id}
          label={history.label}
          patientId={patientId}
          onClose={() => setHistory(null)}
        />
      )}
    </section>
  );
}
