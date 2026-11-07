"use client";

import { PatientAvatar } from "./patient-avatar";
import { StaffAvatar } from "@/features/staff/staff-photo";
import { cn } from "@/lib/utils";

export type PersonPresentation = {
  kind: "patient" | "provider";
  name: string | null | undefined;
  imageId?: string | null;
};

/** Photo IDs keep their native patient-document or staff-photo authorization. */
export function PersonAvatar({
  kind,
  name,
  imageId,
  className,
}: PersonPresentation & { className?: string }) {
  const displayName = name?.trim() || (kind === "provider" ? "Provider" : "Patient");
  return kind === "provider" ? (
    <StaffAvatar
      name={displayName}
      photoId={imageId}
      className={cn("size-7 text-[10px]", className)}
    />
  ) : (
    <PatientAvatar
      name={displayName}
      imageId={imageId ?? undefined}
      className={cn("size-7 text-[10px]", className)}
    />
  );
}

export function PersonIdentity({
  className,
  ...person
}: PersonPresentation & { className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 align-middle", className)}>
      <PersonAvatar {...person} />
      <span className="min-w-0 truncate">
        {person.name?.trim() || (person.kind === "provider" ? "Provider" : "Patient")}
      </span>
    </span>
  );
}
