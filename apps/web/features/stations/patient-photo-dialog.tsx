"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety } from "@/features/workspace/safety-provider";
import { UploadControl } from "@/features/documents/upload-control";
import { useRemote } from "@/features/patients/use-remote";
import { PatientDocumentsDocument } from "@/lib/graphql/generated";
import { errorMessage } from "@/lib/auth/client";
import { stationRequest } from "./client";
import type { GalleryItem } from "./dashboard-client";

type Portrait = { version: number; image_id: string | null };
export function PatientPhotoDialog({
  patient,
  onClose,
  onSaved,
}: {
  patient: GalleryItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { organizationId } = useWorkspace();
  const { confirm } = useSafety();
  const [portrait, setPortrait] = useState<Portrait | null>(null);
  const [candidate, setCandidate] = useState<string | null>(patient.portrait_id);
  const [uploaded, setUploaded] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const documents = useRemote(PatientDocumentsDocument, {
    organizationId,
    patientId: patient.patient_id,
    purpose: "clinical",
    versionIds: uploaded ? [uploaded] : [],
  });
  const files = Array.from(
    new Map(
      [...(documents.data?.documentVersions ?? []), ...(documents.data?.documents ?? [])].map(
        (file) => [file.id, file],
      ),
    ).values(),
  ).filter(
    (file) =>
      ["image/jpeg", "image/png", "image/webp"].includes(file.contentType) &&
      file.size <= 2 * 1024 * 1024,
  );
  const scanning = files.some((file) =>
    ["pending", "uploading", "unavailable"].includes(file.scanState),
  );
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
    if (!scanning) return;
    const timer = window.setInterval(documents.reload, 5000);
    return () => window.clearInterval(timer);
  }, [scanning, documents.reload]);
  async function close() {
    if (busy) return;
    if (
      uploading &&
      !(await confirm({
        title: "Discard selected photo?",
        description: "The selected image has not finished uploading.",
        action: "Discard selection",
      }))
    )
      return;
    onClose();
  }
  async function save(image: string | null) {
    if (!portrait) return;
    setBusy(true);
    setError("");
    try {
      await stationRequest("portrait", {
        action: "select",
        organization_id: organizationId,
        patient_id: patient.patient_id,
        image_id: image,
        expected_version: portrait.version,
      });
      onSaved();
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }
  const ready =
    candidate === portrait?.image_id ||
    files.some((file) => file.id === candidate && file.scanState === "clean");
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) void close();
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogTitle>Patient photo</DialogTitle>
        <DialogDescription>
          {patient.patient} · Choose a confirmed photo of this patient. Images remain protected in
          their clinical file; only the profile display is circular.
        </DialogDescription>
        <div className="flex items-center gap-4">
          <PatientAvatar
            name={patient.patient}
            imageId={candidate && ready ? candidate : undefined}
            className="size-24 text-2xl"
          />
          <div>
            <p className="font-semibold">{patient.patient}</p>
            <p className="mt-1 text-xs text-muted-foreground">{patient.reference}</p>
          </div>
        </div>
        <UploadControl
          patientId={patient.patient_id}
          purpose="clinical"
          profileImage
          initialLabel="Patient profile photo"
          onPendingChange={setUploading}
          onUploaded={(id) => {
            setUploaded(id);
            documents.reload();
          }}
        />
        <section className="grid gap-3">
          <h3 className="text-sm font-semibold">Patient images</h3>
          <p className="text-xs leading-5 text-muted-foreground">
            Select a scanned image below, then confirm it as the profile photo.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {files.map((file) => (
              <button
                key={file.id}
                type="button"
                className={`grid min-w-0 justify-items-center gap-2 rounded-xl border p-3 text-center text-xs ${candidate === file.id ? "bg-teal-wash border-primary" : "border-border"}`}
                disabled={busy || file.scanState !== "clean"}
                aria-pressed={candidate === file.id}
                onClick={() => setCandidate(file.id)}
              >
                <PatientAvatar
                  name={patient.patient}
                  imageId={file.scanState === "clean" ? file.id : undefined}
                  className="size-14"
                />
                <span className="line-clamp-2 wrap-anywhere">{file.label}</span>
                <span className="text-muted-foreground">
                  {file.scanState === "clean" ? "Scanned" : file.scanState.replaceAll("_", " ")}
                </span>
              </button>
            ))}
          </div>
          {!files.length && (
            <p className="text-sm text-muted-foreground">
              No patient images available yet. Upload a photo above.
            </p>
          )}
        </section>
        {scanning && (
          <p role="status" className="text-xs text-muted-foreground">
            Waiting for the security scan. Pending images cannot be used.
          </p>
        )}
        {(error || !!documents.error) && (
          <p role="alert" className="text-sm text-destructive">
            {error || errorMessage(documents.error)}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!portrait || !candidate || !ready || busy || uploading}
            onClick={() => void save(candidate)}
          >
            Use selected photo
          </Button>
          {portrait?.image_id && (
            <Button variant="ghost" disabled={busy || uploading} onClick={() => void save(null)}>
              Remove profile photo
            </Button>
          )}
          <Button variant="outline" disabled={busy} onClick={() => void close()}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
