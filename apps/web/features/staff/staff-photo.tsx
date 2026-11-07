"use client";

import { useId, useRef, useState } from "react";
import { Camera, Trash2, LoaderCircle } from "lucide-react";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { Button } from "@/components/ui/button";
import { uploadStaffPhoto } from "./client";
import { errorMessage } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

export function StaffAvatar({
  name,
  photoId,
  large = false,
  className,
}: {
  name: string;
  photoId?: string | null;
  large?: boolean;
  className?: string;
}) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const size = cn(large ? "size-24" : "size-14", className);
  return photoId && failedPhoto !== photoId ? (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-full border border-border bg-secondary ${size}`}
    >
      {/* Private same-origin endpoint authorizes every image request. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/backend/staff/photo/${photoId}`}
        alt={`Photo of ${name}`}
        loading="lazy"
        decoding="async"
        onError={() => setFailedPhoto(photoId)}
        className="size-full object-cover"
      />
    </span>
  ) : (
    <PatientAvatar name={name} className={size} />
  );
}

export function StaffPhotoControl({
  name,
  photoId,
  fields,
  onUploaded,
  onRemove,
  disabled = false,
}: {
  name: string;
  photoId?: string | null;
  fields: Record<string, string>;
  onUploaded: (result: { photo_id: string; version: number | null }) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const helpId = useId();
  return (
    <div className="grid justify-items-center gap-3 rounded-xl bg-muted/30 p-5 text-center">
      <button
        type="button"
        disabled={busy || disabled}
        aria-label={photoId ? "Change staff photo" : "Upload staff photo"}
        aria-describedby={helpId}
        onClick={() => input.current?.click()}
        className="relative rounded-full outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
      >
        <StaffAvatar name={name || "Staff"} photoId={photoId} large />
        <span
          aria-hidden
          className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full border-4 border-card bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Camera className="size-4" />
        </span>
      </button>
      <input
        ref={input}
        type="file"
        className="sr-only"
        tabIndex={-1}
        accept="image/jpeg,image/png,image/webp"
        disabled={busy || disabled}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setBusy(true);
          setError("");
          try {
            onUploaded(await uploadStaffPhoto(file, fields));
          } catch (cause) {
            setError(errorMessage(cause));
          } finally {
            setBusy(false);
          }
        }}
      />
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        {busy && (
          <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
        )}
        {busy
          ? "Checking photo…"
          : photoId
            ? "Select the photo to change it"
            : "Select the circle to add a photo"}
      </p>
      {photoId && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy || disabled}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
          Remove photo
        </Button>
      )}
      <p id={helpId} className="max-w-xs text-xs leading-5 text-muted-foreground">
        Optional · JPEG, PNG or WebP · up to 2 MiB and 2048 px. Uploaded photos become the profile
        after a security scan.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
