"use client";

import { Clock3, LockKeyhole, Settings2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MedframeScene } from "@/components/illustrations/medframe-scene";
import { PersonIdentity } from "@/components/application/person-identity";
import { CallStage } from "./call-stage";
import { CallDeviceSettings } from "./call-device-settings";
import { DeviceReadiness } from "./device-readiness";
import { callDate } from "./call-format";
import type { CallState } from "./client";
import type { CallMedia } from "./use-call-media";

export function PatientWaitingRoom({
  state,
  media,
  leave,
  error,
}: {
  state: CallState;
  media: CallMedia;
  leave: () => void;
  error: string;
}) {
  const [settings, setSettings] = useState(false);
  return (
    <main id="main" className="min-h-svh bg-background p-4 sm:p-8">
      <div className="mx-auto grid max-w-6xl gap-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Your appointment waiting room</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {state.timing_mode === "instant"
                ? "Instant consultation · no scheduled entry window"
                : `${callDate(state.start, state.timezone)} · ${state.timezone ?? "Asia/Manila"}`}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <PersonIdentity kind="patient" name={state.patient} />
              <PersonIdentity kind="provider" name={state.doctor} />
            </div>
          </div>
          <Button variant="outline" onClick={leave}>
            Leave waiting room
          </Button>
        </header>
        <div
          className="flex items-start gap-3 rounded-xl border border-info/20 bg-info-soft p-4 text-info"
          role="status"
        >
          <Clock3 aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div>
            <h2 className="font-semibold">Waiting for your doctor to admit you</h2>
            <p className="mt-1 text-sm leading-6">
              Your PIN was accepted. You can check your devices here; camera, audio, chat and files
              are not shared with the room yet.
            </p>
          </div>
        </div>
        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid min-w-0 gap-4">
            <CallStage state={{ ...state, started: false }} media={media} />
            <div className="flex flex-wrap gap-2">
              <Button disabled={media.busy} onClick={() => void media.checkDevices()}>
                Check camera & microphone
              </Button>
              <Button
                variant="outline"
                disabled={media.busy}
                onClick={() => void media.toggleCamera()}
              >
                {media.camera ? "Camera preference: on" : "Camera preference: off"}
              </Button>
              <Button
                variant="outline"
                disabled={media.busy}
                onClick={() => void media.toggleMicrophone()}
              >
                {media.microphone ? "Microphone preference: on" : "Microphone preference: off"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSettings(true);
                  void media.refreshDevices();
                }}
              >
                <Settings2 aria-hidden className="size-4" />
                Device settings
              </Button>
            </div>
          </div>
          <div className="grid min-w-0 gap-4">
            <MedframeScene name="online-waiting-room" className="max-w-xs" />
            <DeviceReadiness media={media} />
            <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <LockKeyhole aria-hidden className="mt-0.5 size-4 shrink-0" />
              Only readiness flags are reported to the doctor. Preview video, microphone samples and
              the test sound stay on this device.
            </p>
            {(error || media.error) && (
              <p role="alert" className="rounded-lg bg-destructive/5 p-4 text-sm text-destructive">
                {error || media.error}
              </p>
            )}
          </div>
        </div>
        <CallDeviceSettings open={settings} close={() => setSettings(false)} media={media} />
      </div>
    </main>
  );
}
