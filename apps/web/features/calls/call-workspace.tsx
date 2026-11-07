"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConnectionRecovery } from "./connection-recovery";
import { useModelPresentation } from "./use-model-presentation";
import { ModelPresentationControls } from "./model-presentation-controls";
import { ModelPresentationStage } from "./model-presentation-stage";
import { ModelPresentationNotice } from "./model-presentation-notice";
import { CallStage } from "./call-stage";
import { CallDeviceSettings } from "./call-device-settings";
import { CallControls } from "./call-controls";
import { ConsultationHeader } from "./consultation-header";
import { AppointmentTools } from "./appointment-tools";
import { ConversationDock } from "./conversation-dock";
import { RoomInformation } from "./room-information";
import type { CallMedia } from "./use-call-media";
import type { CallState } from "./client";

export function CallWorkspace({
  state,
  media,
  seconds,
  busy,
  error,
  notice,
  admit,
  remove,
  start,
  extend,
  leave,
  end,
  refresh,
  conversation,
  openClinical,
}: {
  state: CallState;
  media: CallMedia;
  seconds: number;
  busy: boolean;
  error: string;
  notice: string;
  admit: (participantId: string) => void;
  remove: (participantId: string) => Promise<boolean>;
  start: () => void;
  extend: (minutes: number) => void;
  leave: () => void;
  end: () => void;
  refresh: () => void;
  conversation: ReactNode;
  openClinical?: () => void;
}) {
  const share = useModelPresentation(state);
  const presenting = !!share.presentation?.active;
  const [videoMinimized, setVideoMinimized] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [settings, setSettings] = useState(false);
  const [info, setInfo] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    setShowConversation(window.matchMedia("(min-width: 1024px)").matches);
  }, []);
  const openSettings = () => {
    setSettings(true);
    void media.refreshDevices();
  };
  const status = media.offline
    ? "Browser offline"
    : media.phase === "reconnecting"
      ? "Connection interrupted · reconnecting"
      : media.phase === "connecting"
        ? "Connecting to call"
        : media.phase === "disconnected"
          ? "Call disconnected"
          : !state.media_ready
            ? "Call service unavailable"
            : !state.started
              ? state.patient_lobby
                ? state.patient_lobby.admitted
                  ? "Patient admitted · ready to start"
                  : "Patient waiting for admission"
                : "Waiting for patient"
              : media.phase === "connected"
                ? media.remotePresent
                  ? "In consultation"
                  : "Waiting for other participant"
                : "Appointment started · join call when ready";
  return (
    <main id="main" className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
      <ConsultationHeader
        state={state}
        seconds={seconds}
        status={status}
        busy={busy}
        info={() => setInfo(true)}
        admit={() => {
          if (state.patient_lobby) admit(state.patient_lobby.id);
        }}
        leave={leave}
        openClinical={openClinical}
      />
      <ModelPresentationNotice share={share} doctor={state.role === "doctor"} />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <section
          className="relative flex min-h-0 min-w-0 flex-1 p-2 sm:p-3"
          aria-label="Video workspace"
        >
          <div
            className={
              presenting
                ? videoMinimized
                  ? "absolute right-5 bottom-20 z-20 h-9 w-48 overflow-hidden rounded-lg border border-border shadow-md"
                  : "absolute right-5 bottom-20 z-20 h-36 w-48 overflow-hidden rounded-lg border border-border shadow-md"
                : "flex h-full min-h-0 w-full flex-1"
            }
          >
            <CallStage state={state} media={media} fit compact={presenting} />
            {presenting && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-1 right-1 z-30 h-7 text-xs"
                onClick={() => setVideoMinimized((value) => !value)}
              >
                {videoMinimized ? "Show video" : "Minimize video"}
              </Button>
            )}
          </div>
          {presenting && (
            <ModelPresentationStage
              key={share.presentation?.epoch}
              share={share}
              doctor={state.role === "doctor"}
            />
          )}
          {(error || media.error || notice || !state.media_ready || seconds <= 300) && (
            <div className="absolute top-16 right-5 left-5 z-20 max-h-[30%] overflow-y-auto rounded-lg border border-border bg-card p-3 text-xs shadow-sm sm:left-6 sm:max-w-md">
              {error || media.error ? (
                <div role="alert">
                  <p className="text-destructive">{error || media.error}</p>
                  <Button variant="ghost" size="sm" className="mt-1" onClick={refresh}>
                    Refresh room status
                  </Button>
                </div>
              ) : !state.media_ready ? (
                <p role="status">
                  The call service is unavailable.{" "}
                  <button className="cursor-pointer underline underline-offset-2" onClick={refresh}>
                    Refresh room status
                  </button>{" "}
                  before reconnecting.
                </p>
              ) : notice ? (
                <p role="status" className="text-teal-ink">
                  {notice}
                </p>
              ) : (
                <p role="status">
                  Less than five minutes remain.{" "}
                  {state.role === "doctor"
                    ? "Use Add time if needed."
                    : "Your doctor can extend the appointment."}
                </p>
              )}
            </div>
          )}
          <div className="absolute bottom-16 left-5 z-20 max-h-[35%] max-w-[calc(100%-2.5rem)] overflow-y-auto sm:max-w-sm">
            <ConnectionRecovery media={media} canConnect={state.started} />
          </div>
        </section>
        <ConversationDock open={showConversation} close={() => setShowConversation(false)}>
          {conversation}
        </ConversationDock>
      </div>
      <CallControls
        state={state}
        media={media}
        busy={busy}
        presentationControls={
          <ModelPresentationControls share={share} doctor={state.role === "doctor"} />
        }
        chatOpen={showConversation}
        toggleChat={() => setShowConversation((value) => !value)}
        settings={openSettings}
        start={start}
        end={end}
      >
        <AppointmentTools
          state={state}
          busy={busy}
          extend={extend}
          info={() => setInfo(true)}
          settings={openSettings}
          help={() => setHelp(true)}
        />
      </CallControls>
      <CallDeviceSettings open={settings} close={() => setSettings(false)} media={media} />
      <RoomInformation
        state={state}
        media={media}
        share={share}
        open={info}
        close={() => setInfo(false)}
        busy={busy}
        admit={admit}
        remove={remove}
      />
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogTitle>Help & privacy</DialogTitle>
          <DialogDescription>
            Camera and microphone are shared only after you join the call. A local preview does not
            connect you.
          </DialogDescription>
          <div className="space-y-3 text-sm leading-6">
            <p>
              Use Device settings to check your camera, microphone signal and speaker. If permission
              is blocked, allow it in your browser’s site settings, then try again.
            </p>
            <p>
              {state.connection?.profile === "loopback"
                ? "This setup supports local media connections. Cross-device internet calling has not been confirmed."
                : "Call availability depends on your connection and the clinic’s configured media service."}
            </p>
            <p>
              Use a quiet space and headphones. No recording or AI integration is available. Files
              become downloadable after their security scan passes.
            </p>
            <p>
              Leaving disconnects you without ending the room. Ending the appointment closes it for
              everyone; clinical notes must be finalized separately.
            </p>
          </div>
          <Button onClick={() => setHelp(false)}>Done</Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
