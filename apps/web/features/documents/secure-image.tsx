"use client";

import { workspaceHeaders } from "@/lib/auth/client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { DocumentDownloadDocument } from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { cn } from "@/lib/utils";

export function SecureImage({
  id,
  avatar = false,
  alt,
  className,
  fallback,
}: {
  id: string;
  avatar?: boolean;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const { organizationId } = useWorkspace();
  const [failed, setFailed] = useState<string | null>(null);
  const [source, setSource] = useState<{ id: string; organization: string; url: string } | null>(
    null,
  );
  useEffect(() => {
    let active = true;
    const refresh = () =>
      void getGraphqlClient()
        .request(DocumentDownloadDocument, { organizationId, versionId: id })
        .then((result) => {
          if (active)
            setSource({
              id,
              organization: organizationId,
              url: `/api/backend/documents/download?ticket=${encodeURIComponent(result.authorizeDocumentDownload)}${workspaceHeaders()["X-Medframe-Workspace"] ? "&workspace=station" : ""}`,
            });
        })
        .catch(() => {
          if (active) setSource(null);
        });
    refresh();
    const timer = window.setInterval(refresh, 50000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [id, organizationId]);
  if (
    !source ||
    source.id !== id ||
    source.organization !== organizationId ||
    failed === source.url
  )
    return (
      fallback ?? (
        <span
          className={cn(
            "inline-flex size-10 items-center justify-center bg-muted text-xs",
            avatar && "rounded-full",
            className,
            fallback,
          )}
          role="img"
          aria-label={alt}
        >
          Image
        </span>
      )
    );
  return (
    <Image
      unoptimized
      src={source.url}
      width={128}
      height={128}
      alt={alt}
      onError={() => setFailed(source.url)}
      className={cn(
        "h-12 w-auto object-contain",
        avatar && "size-12 rounded-full object-cover",
        className,
        fallback,
      )}
    />
  );
}
