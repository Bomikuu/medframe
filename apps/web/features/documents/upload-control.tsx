"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera } from "@/components/icons";
import { getCsrfToken, errorMessage } from "@/lib/auth/client";
import { getGraphqlClient } from "@/lib/graphql/client";
import { BeginUploadDocument } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";

export function UploadControl({
  patientId,
  encounterId,
  purpose = "clinical",
  profileImage = false,
  onUploaded,
  documentId,
  initialLabel = "",
  onPendingChange,
}: {
  patientId?: string;
  encounterId?: string;
  purpose?: "clinical" | "avatar" | "logo" | "website";
  profileImage?: boolean;
  onUploaded: (versionId?: string) => void;
  documentId?: string;
  initialLabel?: string;
  onPendingChange?: (pending: boolean) => void;
}) {
  const { organizationId } = useWorkspace();
  const capture = useRequestScope();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const [label, setLabel] = useState(initialLabel);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const transfer = useRef<XMLHttpRequest | null>(null);
  useEffect(
    () => () => {
      transfer.current?.abort();
      transfer.current = null;
      setProgress(null);
      onPendingChange?.(false);
    },
    [onPendingChange],
  );
  useUnsavedChanges(
    `${organizationId}:${patientId ?? purpose}:${encounterId ?? "general"}:upload`,
    file !== null || progress !== null,
    () => {
      transfer.current?.abort();
      setFile(null);
      setPreview(null);
      setLabel("");
      if (input.current) input.current.value = "";
      onPendingChange?.(false);
    },
  );
  const avatar = purpose === "avatar" || profileImage;

  async function upload() {
    if (!file || progress !== null) return;
    const isCurrent = capture();
    const limit = purpose === "clinical" && !profileImage ? 20 : 2;
    if (profileImage && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG or WebP patient image.");
      return;
    }
    if (file.size > limit * 1024 * 1024 || !label.trim()) {
      setError(`Add a label and choose a file no larger than ${limit}MiB.`);
      return;
    }
    setProgress(0);
    setError("");
    setMessage("");
    try {
      const started = await getGraphqlClient().request(BeginUploadDocument, {
        organizationId,
        patientId,
        encounterId,
        purpose,
        metadata: {
          filename: file.name,
          content_type: file.type,
          size: file.size,
          label: label.trim(),
          ...(documentId ? { document_id: documentId } : {}),
        },
      });
      if (!isCurrent()) return;
      const csrf = await getCsrfToken();
      const form = new FormData();
      form.set("organizationId", organizationId);
      form.set("file", file);
      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        transfer.current = request;
        request.open("POST", `/api/backend/documents/upload/${started.beginDocumentUpload.id}`);
        request.setRequestHeader("X-CSRF-Token", csrf);
        request.timeout = 60000;
        request.upload.onprogress = (event) => {
          if (event.lengthComputable && isCurrent())
            setProgress(Math.round((event.loaded / event.total) * 100));
        };
        request.onload = () =>
          request.status >= 200 && request.status < 300
            ? resolve()
            : reject(
                new Error(
                  "Upload was rejected. Check the file type, dimensions, and record access, then retry.",
                ),
              );
        request.onerror = () =>
          reject(new Error("Connection lost. Select the file again to retry."));
        request.ontimeout = () =>
          reject(new Error("Upload timed out. Refresh the document list before retrying."));
        request.onabort = () =>
          reject(
            new Error(
              "Transfer cancelled. Refresh the document list to check whether the server received it.",
            ),
          );
        request.send(form);
      });
      if (!isCurrent()) return;
      setFile(null);
      setPreview(null);
      onPendingChange?.(false);
      setLabel("");
      if (input.current) input.current.value = "";
      setMessage("File received. A security scan must finish before it can be used.");
      onUploaded(started.beginDocumentUpload.id);
    } catch (failure) {
      if (isCurrent()) setError(errorMessage(failure));
    } finally {
      if (isCurrent()) {
        setProgress(null);
        transfer.current = null;
      }
    }
  }

  return (
    <div className="grid gap-4 rounded-lg border border-dashed border-input p-5">
      {documentId && (
        <p className="text-sm font-medium">
          Upload a new version of {initialLabel}. Earlier versions and visit links remain preserved.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-5">
        {avatar && (
          <button
            type="button"
            className="flex size-24 shrink-0 items-center justify-center rounded-full border border-input bg-muted"
            aria-label="Choose profile image"
            onClick={() => input.current?.click()}
          >
            {preview ? (
              <Image
                src={preview}
                alt="Selected profile image preview"
                width={96}
                height={96}
                className="size-full rounded-full object-cover"
                unoptimized
              />
            ) : (
              <Camera size={28} />
            )}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <FormField
            id={`file-${purpose}`}
            label={
              profileImage
                ? "Choose patient photo"
                : purpose === "clinical"
                  ? "Choose clinical image or PDF"
                  : `Choose ${purpose} image`
            }
            hint={
              profileImage
                ? "JPEG, PNG or WebP, up to 2MiB. The original is preserved; only its portrait preview is circular."
                : purpose === "clinical"
                  ? "JPEG, PNG, WebP, or PDF, up to 20MiB. Clinical images retain their full framing."
                  : "JPEG, PNG, or WebP, up to 2MiB and 2048 pixels per side."
            }
          >
            <input
              ref={input}
              id={`file-${purpose}`}
              type="file"
              className="block min-h-11 w-full text-sm file:mr-4 file:rounded-md file:border file:border-input file:bg-background file:px-4 file:py-2 file:text-foreground"
              accept={
                purpose === "clinical" && !profileImage
                  ? "image/jpeg,image/png,image/webp,application/pdf"
                  : "image/jpeg,image/png,image/webp"
              }
              disabled={progress !== null}
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
                setPreview(selected && avatar ? URL.createObjectURL(selected) : null);
                onPendingChange?.(!!event.target.files?.length);
                setError("");
              }}
              aria-describedby={`file-${purpose}-help`}
            />
          </FormField>
        </div>
      </div>
      <FormField
        id={`file-label-${purpose}`}
        label={purpose === "clinical" ? "Document label" : "Image label"}
      >
        <Input
          id={`file-label-${purpose}`}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          maxLength={120}
          disabled={progress !== null}
          placeholder={
            purpose === "clinical"
              ? "For example, consultation image"
              : purpose === "website"
                ? "For example, clinic reception photo"
                : "For example, clinic logo"
          }
        />
      </FormField>
      <div className="flex flex-wrap items-center gap-3">
        {file && progress === null && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setFile(null);
              setPreview(null);
              setLabel("");
              if (input.current) input.current.value = "";
              onPendingChange?.(false);
            }}
          >
            Clear selected file
          </Button>
        )}
        <Button
          type="button"
          onClick={() => void upload()}
          disabled={!file || progress !== null}
          aria-busy={progress !== null}
        >
          {progress === null ? "Upload file" : `Uploading ${progress}%`}
        </Button>
        {progress !== null && (
          <Button type="button" variant="outline" onClick={() => transfer.current?.abort()}>
            Cancel transfer
          </Button>
        )}
      </div>
      {progress !== null && (
        <progress
          max={100}
          value={progress}
          aria-label="File upload progress"
          className="h-2 w-full accent-primary"
        />
      )}
      {error !== null && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
