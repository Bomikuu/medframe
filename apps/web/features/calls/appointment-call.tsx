"use client";

import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
const DoctorClinicalPanel = dynamic(
  () => import("./doctor-clinical-panel").then((module) => module.DoctorClinicalPanel),
  { ssr: false },
);
import { CallEndScreen } from "./call-end-screen";
import { ButtonLink } from "@/components/ui/button-link";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WorkspaceLoading } from "@/components/application/workspace-loading";
import { CallWorkspace } from "./call-workspace";
import { CallConversation } from "./call-conversation";
import { RoomEntry } from "./room-entry";
import { PatientWaitingRoom } from "./patient-waiting-room";
import { callRequest } from "./client";
import { errorMessage } from "@/lib/auth/client";
import { useCallRoom } from "./use-call-room";
import { useCallMedia } from "./use-call-media";

export function AppointmentCall({ roomId }: { roomId: string }) {
  const call = useCallRoom(roomId);
  const { state, ended, busy, seconds } = call;
  const [confirmation, setConfirmation] = useState<"leave" | "end" | null>(null);
  const [left, setLeft] = useState(false);
  const [clinicalOpen, setClinicalOpen] = useState(false);
  const media = useCallMedia(
    roomId,
    !!state?.role && !ended && !left,
    !!state?.started && (state?.role === "doctor" || state?.admitted !== false),
  );
  const [notice, setNotice] = useState("");
  const [readinessError, setReadinessError] = useState("");
  const cameraChecked = media.camera && media.hasLocalVideo;
  const microphoneChecked = media.checks.microphoneDetected;
  const speakerChecked = media.checks.speakerConfirmed;
  useEffect(() => {
    if (state?.role !== "patient" || ended || left) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void callRequest(
        "readiness",
        roomId,
        {
          checks: { camera: cameraChecked, microphone: microphoneChecked, speaker: speakerChecked },
        },
        controller.signal,
      )
        .then(() => setReadinessError(""))
        .catch((failure) => {
          if (!controller.signal.aborted) setReadinessError(errorMessage(failure));
        });
    }, 500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [roomId, state?.role, ended, left, cameraChecked, microphoneChecked, speakerChecked]);
  function renderSurface() {
    if (ended || left)
      return (
        <CallEndScreen
          state={state}
          left={left}
          reason={call.closeReason}
          error={call.error}
          returnToRoom={() => {
            setLeft(false);
            void call.refresh();
          }}
          openClinical={() => setClinicalOpen(true)}
        />
      );
    if (!state && !call.error)
      return (
        <WorkspaceLoading
          title="Opening your appointment"
          detail="Checking the room, access window and connection service."
        />
      );
    if (!state)
      return (
        <main id="main" className="grid min-h-svh place-items-center p-5">
          <section className="grid max-w-lg justify-items-center gap-4 rounded-xl border border-border bg-card p-8 text-center">
            <LockKeyhole aria-hidden className="size-10 text-teal-ink" />
            <h1 className="text-2xl font-semibold">We couldn’t open this room</h1>
            <p role="alert" className="text-sm text-muted-foreground">
              {call.error}
            </p>
            <Button onClick={() => location.reload()}>Try again</Button>
            <ButtonLink variant="ghost" href="/portal">
              Patient portal
            </ButtonLink>
          </section>
        </main>
      );
    if (!state.role)
      return <RoomEntry state={state} busy={busy} error={call.error} join={call.join} />;
    const waiting = state.role === "patient" && state.admitted === false;
    return (
      <>
        {waiting ? (
          <PatientWaitingRoom
            state={state}
            media={media}
            error={call.error || readinessError}
            leave={() => setConfirmation("leave")}
          />
        ) : (
          <CallWorkspace
            state={state}
            media={media}
            openClinical={() => setClinicalOpen(true)}
            seconds={seconds}
            busy={busy}
            error={call.error || readinessError}
            notice={notice}
            admit={(participantId) =>
              void call.action("admit_patient", { participant_id: participantId })
            }
            remove={(participantId) =>
              call.action("remove_patient", { participant_id: participantId })
            }
            start={() => void call.action("start")}
            extend={(minutes) =>
              void call.action("extend", { minutes }).then((saved) => {
                if (saved) setNotice(`Appointment extended by ${minutes} minutes.`);
              })
            }
            leave={() => setConfirmation("leave")}
            end={() => setConfirmation("end")}
            refresh={() => void call.refresh()}
            conversation={
              <CallConversation
                key={`${state.id}:${state.generation}:${state.participant_id}`}
                state={state}
                refresh={call.refresh}
              />
            }
          />
        )}
        <Dialog
          open={!!confirmation}
          onOpenChange={(open) => {
            if (!open && !busy) setConfirmation(null);
          }}
        >
          <DialogContent>
            <DialogTitle>
              {confirmation === "end" ? "End this appointment for everyone?" : "Leave the call?"}
            </DialogTitle>
            <DialogDescription>
              {confirmation === "end"
                ? "Camera, microphone, chat and file access will close for both participants. Clinical notes remain separate."
                : state.timing_mode === "instant"
                  ? "Your camera and microphone will disconnect. The room stays open until the doctor ends it. Any unsent message will be discarded."
                  : "Your camera and microphone will disconnect. The room remains available until its end time. Any unsent message will be discarded."}
            </DialogDescription>
            <div className="flex justify-end gap-3">
              <Button variant="outline" disabled={busy} onClick={() => setConfirmation(null)}>
                Cancel
              </Button>
              <Button
                variant={confirmation === "end" ? "destructive" : "default"}
                disabled={busy}
                onClick={async () => {
                  if (confirmation === "end") {
                    if (!(await call.action("end"))) return;
                  } else setLeft(true);
                  media.leave();
                  setConfirmation(null);
                }}
              >
                {confirmation === "end" ? "End for everyone" : "Leave call"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
  return (
    <>
      {renderSurface()}
      {state?.role === "doctor" && (
        <DoctorClinicalPanel
          key={`${state.id}:${state.participant_id}`}
          state={state}
          open={clinicalOpen}
          close={() => setClinicalOpen(false)}
          ended={ended}
          busy={busy}
          refresh={() => void call.refresh()}
          publish={(steps, followUp) =>
            call.action("publish_aftercare", {
              next_steps: steps,
              follow_up: followUp,
              reviewed: true,
            })
          }
        />
      )}
    </>
  );
}
