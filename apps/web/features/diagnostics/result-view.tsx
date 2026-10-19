"use client";
import { DocumentPreview } from "@/features/documents/document-preview";
import { AuthorizeDiagnosticDownloadDocument } from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { z } from "zod";
import { resultSchema } from "./schema";
export function DiagnosticFile({
  requestId,
  context,
  file,
}: {
  requestId: string;
  context: "clinic" | "center";
  file: { id: string; label: string; content_type: string };
}) {
  const { organizationId } = useWorkspace();
  return (
    <DocumentPreview
      label={file.label}
      contentType={file.content_type}
      authorize={async () => {
        const result = await getGraphqlClient().request(AuthorizeDiagnosticDownloadDocument, {
          organizationId,
          requestId,
          versionId: file.id,
          context,
        });
        return `/api/backend/diagnostics/documents/download?ticket=${encodeURIComponent(result.authorizeDiagnosticDownload)}`;
      }}
    />
  );
}
export function DiagnosticResultView({
  result,
  requestId,
  context,
}: {
  result: z.infer<typeof resultSchema>;
  requestId: string;
  context: "clinic" | "center";
}) {
  return (
    <section className="grid min-w-0 gap-5">
      <div>
        <h2 className="text-xl font-semibold">Submitted result · version {result.sequence}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.author} · Examination {new Date(result.performed_at).toLocaleString()}
        </p>
        {result.reason && <p className="mt-2 text-sm">Correction reason: {result.reason}</p>}
      </div>
      <div className="max-w-prose text-sm leading-7 wrap-anywhere whitespace-pre-wrap">
        {result.report || "Report supplied as an attached file."}
      </div>
      {result.accession && <p className="text-sm">Accession: {result.accession}</p>}
      <div className="grid gap-3">
        {result.files.map((file) => (
          <DiagnosticFile key={file.id} requestId={requestId} context={context} file={file} />
        ))}
      </div>
      {result.review && (
        <section className="grid gap-3 border-t border-border pt-5">
          <h3 className="font-semibold">Clinician review of this exact version</h3>
          <p className="text-sm leading-7 whitespace-pre-wrap">{result.review.interpretation}</p>
          <p className="text-sm leading-7 whitespace-pre-wrap">{result.review.next_steps}</p>
          <p className="text-sm text-muted-foreground">Reviewed by {result.review.author}</p>
        </section>
      )}
    </section>
  );
}
