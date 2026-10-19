"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { BeginDiagnosticUploadDocument } from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { getCsrfToken } from "@/lib/auth/client";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { financialFailure } from "@/features/billing/use-billing";
export function ResultUpload({ requestId, reload }: { requestId: string; reload: () => void }) {
  const { organizationId } = useWorkspace();
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const receipt = useRef({ payload: "", key: "" });
  const capture = useRequestScope();
  async function upload() {
    if (!file || busy) return;
    const current = capture();
    setBusy(true);
    setError("");
    try {
      const metadata = { filename: file.name, content_type: file.type, size: file.size, label };
      const payload = JSON.stringify({ organizationId, requestId, metadata });
      if (receipt.current.payload !== payload)
        receipt.current = { payload, key: crypto.randomUUID() };
      const response = await getGraphqlClient().request(BeginDiagnosticUploadDocument, {
        organizationId,
        diagnosticRequestId: requestId,
        metadata,
        requestId: receipt.current.key,
      });
      const version = response.beginDiagnosticUpload as { id: string };
      const data = new FormData();
      data.set("organizationId", organizationId);
      data.set("file", file);
      const result = await fetch(`/api/backend/diagnostics/documents/upload/${version.id}`, {
        method: "POST",
        headers: { "X-CSRF-Token": await getCsrfToken() },
        body: data,
      });
      if (!result.ok)
        throw new Error("Upload was not accepted. Refresh the request before trying again.");
      if (current()) {
        setFile(null);
        setLabel("");
        if (input.current) input.current.value = "";
        reload();
      }
    } catch (error) {
      if (current()) setError(financialFailure(error));
    } finally {
      if (current()) setBusy(false);
    }
  }
  return (
    <fieldset className="grid gap-4 border-t border-border pt-5">
      <legend className="font-semibold">Result attachments</legend>
      <p className="text-sm leading-6 text-muted-foreground">
        JPEG, PNG, WebP or PDF, up to 20 MiB. Files stay private and cannot be submitted until their
        security scan is clean. DICOM is not supported yet.
      </p>
      <FormField id="result-label" label="Clinical file label">
        <Input
          id="result-label"
          value={label}
          maxLength={120}
          onChange={(e) => setLabel(e.target.value)}
        />
      </FormField>
      <FormField id="result-file" label="Choose full-frame file">
        <Input
          ref={input}
          id="result-file"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </FormField>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={busy || !file || !label.trim()}
        onClick={() => void upload()}
      >
        {busy ? "Uploading…" : "Upload for security scan"}
      </Button>
    </fieldset>
  );
}
