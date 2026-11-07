"use client";

import { Camera, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/features/patients/form-controls";
import { DeviceCameraPreview } from "./device-camera-preview";
import { DeviceReadiness } from "./device-readiness";
import type { CallMedia } from "./use-call-media";

export function CallDeviceSettings({
  open,
  close,
  media,
}: {
  open: boolean;
  close: () => void;
  media: CallMedia;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>Device settings</DialogTitle>
        <DialogDescription>
          Choose the devices you want to use. Browser permission is required before device names may
          appear.
        </DialogDescription>
        <DeviceCameraPreview media={media} />
        <Button variant="outline" disabled={media.busy} onClick={() => void media.toggleCamera()}>
          {media.camera ? "Turn camera off" : "Turn camera on"}
        </Button>
        {(["videoinput", "audioinput"] as const).map((kind) => {
          const choices = media.devices.filter((item) => item.kind === kind);
          const selected = kind === "videoinput" ? media.cameraId : media.microphoneId;
          return (
            <div key={kind} className="grid gap-2">
              <FormSelect
                id={`call-device-${kind}`}
                label={kind === "videoinput" ? "Camera" : "Microphone"}
                disabled={media.busy}
                value={selected || "default-device"}
                onChange={(value) =>
                  void media.chooseDevice(kind, value === "default-device" ? "" : value)
                }
                options={[
                  { value: "default-device", label: "Browser default" },
                  ...choices
                    .filter((item) => item.deviceId !== "default")
                    .map((item, index) => ({
                      value: item.deviceId,
                      label:
                        item.label ||
                        `${kind === "videoinput" ? "Camera" : "Microphone"} ${index + 1}`,
                    })),
                ]}
              />
              <p className="text-xs text-muted-foreground">
                {choices.length
                  ? "Available devices on this browser."
                  : "Check devices to grant permission, or use your browser’s default."}
              </p>
            </div>
          );
        })}
        {media.error && (
          <p role="alert" className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive">
            {media.error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={media.busy}
            onClick={() => void media.refreshDevices()}
          >
            <RefreshCw aria-hidden className="size-4" />
            Refresh devices
          </Button>
          {!["connected", "reconnecting", "connecting"].includes(media.phase) && (
            <Button
              variant="outline"
              disabled={media.busy}
              onClick={() => void media.checkDevices()}
            >
              <Camera aria-hidden className="size-4" />
              Check devices
            </Button>
          )}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Device preferences apply to this browser session. If access is blocked, allow the camera
          or microphone in your browser’s site settings, then try again. No recording is available
          in this room.
        </p>
        <section className="border-t border-border pt-4">
          <h2 className="text-sm font-semibold">Audio output</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Using your browser’s default speaker. Change output in your device’s sound settings.
          </p>
        </section>
        <DeviceReadiness media={media} />
        <section className="border-t border-border pt-4">
          <h2 className="text-sm font-semibold">Connection</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {media.offline
              ? "Browser offline"
              : `Media: ${media.phase} · Connection quality: ${media.quality}`}
          </p>
        </section>
        <Button onClick={close}>Done</Button>
      </DialogContent>
    </Dialog>
  );
}
