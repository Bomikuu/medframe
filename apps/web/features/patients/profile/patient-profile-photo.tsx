"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import type { PatientDetailsFragment } from "@/lib/graphql/generated";
import { PatientPhotoDialog } from "./patient-photo-dialog";

export function PatientProfilePhoto({
  patient,
  imageId,
  onSaved,
  onActions,
}: {
  patient: Pick<PatientDetailsFragment, "id" | "fullName" | "reference">;
  imageId?: string | null;
  onSaved: () => void;
  onActions?: () => void;
}) {
  const { can } = useWorkspace();
  const [intent, setIntent] = useState<"edit" | "remove" | null>(null);
  const control = useRef<HTMLButtonElement>(null);
  const editable =
    can("patients.clinical.read") && can("patients.clinical.write") && can("documents.write");
  const avatar = (
    <PatientAvatar
      name={patient.fullName}
      imageId={imageId ?? undefined}
      className="size-16 border-0 text-xl sm:size-20"
    />
  );
  if (!editable) return avatar;
  if (onActions)
    return (
      <button
        type="button"
        aria-label="Patient photo actions"
        onClick={onActions}
        className="relative rounded-full outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
      >
        {avatar}
        <span
          aria-hidden
          className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground"
        >
          <Camera className="size-3.5" />
        </span>
      </button>
    );
  return (
    <div className="grid shrink-0 justify-items-center gap-1">
      <button
        ref={control}
        type="button"
        aria-label={imageId ? "Change patient photo" : "Upload patient photo"}
        onClick={() => setIntent("edit")}
        className="group relative rounded-full outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
      >
        {avatar}
        <span
          aria-hidden
          className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground transition-colors group-hover:bg-primary/90"
        >
          <Camera className="size-3.5" />
        </span>
      </button>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="mt-1 h-8 px-0 text-xs"
        onClick={() => setIntent("edit")}
      >
        {imageId ? "Change photo" : "Upload photo"}
      </Button>
      {imageId && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-destructive"
          onClick={() => setIntent("remove")}
        >
          Remove
        </Button>
      )}
      {intent && (
        <PatientPhotoDialog
          key={`${patient.id}:${intent}`}
          patient={{
            patient_id: patient.id,
            patient: patient.fullName,
            reference: patient.reference,
            portrait_id: imageId ?? null,
          }}
          intent={intent}
          onClose={() => setIntent(null)}
          onSaved={onSaved}
          onReturnFocus={() => control.current?.focus()}
        />
      )}
    </div>
  );
}
