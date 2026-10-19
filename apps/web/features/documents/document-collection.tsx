"use client";

import type { ReactNode } from "react";
import { FileImage, FileText } from "lucide-react";
import { StatusBadge } from "@/components/application/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export type DocumentFile = {
  id: string;
  documentId: string;
  label: string;
  version: number;
  contentType: string;
  size: number;
  scanState: string;
  createdAt: string;
  encounterId: string | null;
  uploadedBy?: string;
};

export function FileIdentity({ file }: { file: DocumentFile }) {
  const image = file.contentType.startsWith("image/");
  const Icon = image ? FileImage : FileText;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-xl ${image ? "bg-info-soft text-info" : "bg-teal-soft text-teal-ink"}`}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold wrap-anywhere">{file.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {image
            ? "Image"
            : file.contentType === "application/pdf"
              ? "PDF document"
              : file.contentType}{" "}
          · Version {file.version}
        </p>
      </div>
    </div>
  );
}

export function fileSize(size: number) {
  return size >= 1048576
    ? `${(size / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.ceil(size / 1024))} KB`;
}
export function uploadedDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(value));
}

export function DocumentCollection({
  files,
  view,
  timezone,
  renderActions,
  attachedIds,
}: {
  files: DocumentFile[];
  view: "table" | "cards";
  timezone: string;
  renderActions: (file: DocumentFile) => ReactNode;
  attachedIds?: string[];
}) {
  if (view === "cards")
    return (
      <div className="grid min-w-0 gap-4 @[620px]:grid-cols-2 @[1000px]:grid-cols-3">
        {files.map((file) => (
          <Card
            key={file.id}
            data-panel
            className="gap-0 rounded-xl border border-border py-0 ring-0"
          >
            <CardContent className="grid gap-5 p-5">
              <FileIdentity file={file} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge value={file.scanState} />
                <span className="text-xs text-muted-foreground">{fileSize(file.size)}</span>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Uploaded</dt>
                  <dd className="mt-1">{uploadedDate(file.createdAt, timezone)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Uploaded by</dt>
                  <dd className="mt-1 wrap-anywhere">{file.uploadedBy ?? "Not provided"}</dd>
                </div>
              </dl>
              {attachedIds?.includes(file.id) && (
                <p className="text-xs font-medium text-teal-ink">Attached to this revision</p>
              )}
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                {renderActions(file)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <caption className="sr-only">
          Authorized documents and imaging. Dates in {timezone}.
        </caption>
        <TableHeader className="bg-muted/70">
          <TableRow>
            <TableHead className="min-w-64 pl-5">Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="min-w-32">Uploaded</TableHead>
            <TableHead className="min-w-36">Uploaded by</TableHead>
            <TableHead className="whitespace-nowrap">File size</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="pr-5 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell className="pl-5">
                <FileIdentity file={file} />
                {attachedIds?.includes(file.id) && (
                  <p className="mt-2 text-xs font-medium text-teal-ink">
                    Attached to this revision
                  </p>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {file.contentType.startsWith("image/") ? "Image" : "PDF"}
              </TableCell>
              <TableCell className="text-xs">{uploadedDate(file.createdAt, timezone)}</TableCell>
              <TableCell className="max-w-44 text-xs whitespace-normal">
                {file.uploadedBy ?? "Not provided"}
              </TableCell>
              <TableCell className="text-xs whitespace-nowrap">{fileSize(file.size)}</TableCell>
              <TableCell>
                <StatusBadge value={file.scanState} />
              </TableCell>
              <TableCell className="pr-5">
                <div className="flex items-center justify-end gap-2">{renderActions(file)}</div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
