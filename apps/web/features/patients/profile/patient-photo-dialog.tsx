"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety } from "@/features/workspace/safety-provider";
import { UploadControl } from "@/features/documents/upload-control";
import { getGraphqlClient } from "@/lib/graphql/client";
import { errorMessage } from "@/lib/auth/client";
import { stationRequest } from "@/features/stations/client";

type Portrait = { version: number; image_id: string | null };
type Phase = "idle" | "scanning" | "saving" | "error";
const photoStatusQuery = `query PatientProfileUploadStatus($organizationId: UUID!, $patientId: UUID!, $versionIds: [UUID!]!) {
  documentVersions(organizationId: $organizationId, patientId: $patientId, versionIds: $versionIds) { id scanState }
}`;

export function PatientPhotoDialog({
  patient,
  onClose,
  onSaved,
  intent = "edit",
  onReturnFocus,
}: {
  patient: { patient_id: string; patient: string; reference: string; portrait_id: string | null };
  intent?: "edit" | "remove";
  onReturnFocus?: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { organizationId } = useWorkspace();
  const removing = intent === "remove";
  const { confirm } = useSafety();
  const [portrait, setPortrait] = useState<Portrait | null>(null);
  const [uploaded, setUploaded] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const callbacks = useRef({ onSaved, onClose });
  useEffect(() => {
    callbacks.current = { onSaved, onClose };
  }, [onSaved, onClose]);
  const saving = phase === "saving";
  const processing = phase === "scanning" || saving;

  useEffect(() => {
    let active = true;
    stationRequest<Portrait>("portrait", {
      organization_id: organizationId,
      patient_id: patient.patient_id,
    })
      .then((value) => {
        if (active) setPortrait(value);
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      });
    return () => {
      active = false;
    };
  }, [organizationId, patient.patient_id]);

  useEffect(() => {
    if (!uploaded || !portrait || removing) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const version = portrait.version;
    const started = Date.now();
    async function check() {
      try {
        const result = await getGraphqlClient().request<{
          documentVersions: { id: string; scanState: string }[];
        }>({
          document: photoStatusQuery,
          variables: {
            organizationId,
            patientId: patient.patient_id,
            versionIds: [uploaded],
          },
          signal: controller.signal,
        });
        if (!active) return;
        const file = result.documentVersions.find((file) => file.id === uploaded);
        if (!file)
          throw new Error(
            "The uploaded photo is unavailable. Your previous profile photo is unchanged.",
          );
        if (file.scanState === "clean") {
          setPhase("saving");
          await stationRequest("portrait", {
            action: "select",
            organization_id: organizationId,
            patient_id: patient.patient_id,
            image_id: uploaded,
            expected_version: version,
          });
          if (!active) return;
          callbacks.current.onSaved();
          callbacks.current.onClose();
          return;
        }
        if (!["pending", "uploading", "unavailable"].includes(file.scanState))
          throw new Error(
            "This photo did not pass the security scan. Upload another photo; your previous profile photo is unchanged.",
          );
        if (Date.now() - started >= 120000)
          throw new Error(
            "The security scan is taking longer than expected. Check again to finish setting your photo.",
          );
        timer = setTimeout(() => void check(), 4000);
      } catch (cause) {
        if (active) {
          setError(errorMessage(cause));
          setPhase("error");
        }
      }
    }
    void check();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [uploaded, portrait, organizationId, patient.patient_id, removing, attempt]);

  async function close() {
    if (saving) return;
    if (
      (uploading || processing) &&
      !(await confirm({
        title: "Cancel the photo update?",
        description:
          "Your existing profile photo will stay in place. A file already received remains in the patient record.",
        action: "Cancel photo update",
      }))
    )
      return;
    onClose();
  }
  async function remove() {
    if (!portrait) return;
    setPhase("saving");
    setError("");
    try {
      await stationRequest("portrait", {
        action: "select",
        organization_id: organizationId,
        patient_id: patient.patient_id,
        image_id: null,
        expected_version: portrait.version,
      });
      onSaved();
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
      setPhase("error");
    }
  }
  const avatar = (
    <PatientAvatar
      name={patient.patient}
      imageId={portrait?.image_id ?? patient.portrait_id ?? undefined}
      className="size-24 border-0 text-2xl"
    />
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) void close();
      }}
    >
      <DialogContent
        className="max-h-[92dvh] overflow-y-auto sm:max-w-lg"
        onCloseAutoFocus={(event) => {
          if (onReturnFocus) {
            event.preventDefault();
            onReturnFocus();
          }
        }}
      >
        <DialogTitle>{removing ? "Remove patient photo?" : "Patient photo"}</DialogTitle>
        <DialogDescription>
          {removing
            ? `Remove the profile photo for ${patient.patient}. The original image stays in the patient record.`
            : `${patient.patient} · ${patient.reference}. Upload one photo; it becomes the profile automatically after its security scan.`}
        </DialogDescription>
        {removing ? (
          <div className="flex justify-center py-3">{avatar}</div>
        ) : (
          <UploadControl
            patientId={patient.patient_id}
            purpose="clinical"
            profileImage
            initialLabel="Patient profile photo"
            avatarFallback={avatar}
            disabled={!portrait || processing}
            onPendingChange={setUploading}
            onUploaded={(id) => {
              if (!id) {
                setError("The upload could not be identified. Upload the photo again.");
                return;
              }
              setError("");
              setPhase("scanning");
              setUploaded(id);
            }}
          />
        )}
        {processing && (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle
              aria-hidden
              className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
            />
            {saving
              ? "Updating profile photo…"
              : "Scanning your photo. It will become the profile automatically."}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {removing ? (
            <Button
              variant="destructive"
              disabled={!portrait?.image_id || saving}
              onClick={() => void remove()}
            >
              <Trash2 aria-hidden className="size-4" />
              {saving ? "Removing…" : "Remove photo"}
            </Button>
          ) : (
            <>
              {phase === "error" && uploaded && (
                <Button
                  variant="outline"
                  disabled={uploading}
                  onClick={() => {
                    setError("");
                    setPhase("scanning");
                    setAttempt((value) => value + 1);
                  }}
                >
                  <RefreshCw aria-hidden className="size-4" />
                  Check again
                </Button>
              )}
              {portrait?.image_id && (
                <Button
                  variant="ghost"
                  disabled={processing || uploading}
                  onClick={() => void remove()}
                >
                  <Trash2 aria-hidden className="size-4" />
                  Remove photo
                </Button>
              )}
            </>
          )}
          <Button variant="outline" disabled={saving} onClick={() => void close()}>
            {uploading || processing || removing ? "Cancel" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
