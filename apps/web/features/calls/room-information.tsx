"use client";

import type { CallMedia } from "./use-call-media";
import type { ModelPresentation } from "./use-model-presentation";

import { ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ButtonLink } from "@/components/ui/button-link";
import { PersonIdentity } from "@/components/application/person-identity";
import { DoctorAdmission } from "./doctor-admission";
import { ReviewedNextSteps } from "./aftercare";
import { callDate } from "./call-format";
import type { CallState } from "./client";

export function RoomInformation({
  state,
  media,
  share,
  open,
  close,
  busy,
  admit,
  remove,
}: {
  state: CallState;
  media: CallMedia;
  share: ModelPresentation;
  open: boolean;
  close: () => void;
  busy: boolean;
  admit: (id: string) => void;
  remove: (id: string) => Promise<boolean>;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Appointment information</SheetTitle>
          <SheetDescription>Details for this room and its participants.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 px-4 pb-6">
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Patient</dt>
              <dd className="mt-2">
                <PersonIdentity kind="patient" name={state.patient} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Doctor</dt>
              <dd className="mt-2">
                <PersonIdentity kind="provider" name={state.doctor} />
              </dd>
            </div>
            {[
              [
                "Room type",
                state.timing_mode === "instant" ? "Instant consultation" : "Scheduled consultation",
              ],
              [
                state.timing_mode === "instant" ? "Created" : "Appointment time",
                callDate(state.start, state.timezone),
              ],
              [
                "Room closes",
                state.timing_mode === "instant"
                  ? "When the doctor ends the room"
                  : callDate(state.end, state.timezone),
              ],
              ["Timezone", state.timezone ?? "Asia/Manila"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
          <section
            aria-label="Connection and access facts"
            className="grid gap-3 border-t border-border pt-5 text-xs leading-5"
          >
            <h3 className="text-sm font-semibold">Connection & access</h3>
            <dl className="grid gap-3">
              <div>
                <dt className="text-muted-foreground">Audio & video</dt>
                <dd className="mt-1">
                  {media.offline ? "Browser offline" : media.phase.replaceAll("_", " ")}
                  {media.phase === "connected"
                    ? media.remotePresent
                      ? " · other participant connected"
                      : " · waiting for other participant"
                    : ""}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Shared model</dt>
                <dd className="mt-1">
                  {share.connection} ·{" "}
                  {share.presentation?.active
                    ? share.presentation.allow_patient_selection
                      ? "patient selection allowed"
                      : "view only"
                    : "no model being presented"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Room access</dt>
                <dd className="mt-1">
                  {state.role === "doctor"
                    ? "Doctor access follows the clinic’s assigned or eligible-provider rule."
                    : "Your room session belongs to this appointment; it does not open the clinician’s private chart."}{" "}
                  A patient must still be admitted by the doctor.
                </dd>
              </div>
            </dl>
            <p className="text-muted-foreground">
              Room updates, shared models and audio/video use separate connections. A ready model
              does not prove that the other participant can hear you. If a connection drops, keep
              unsent chat here and check the room is still open before rejoining.
            </p>
          </section>
          {state.role === "doctor" && (
            <DoctorAdmission state={state} busy={busy} admit={admit} remove={remove} />
          )}
          {state.role === "doctor" && state.patient_id && (
            <ButtonLink
              variant="outline"
              href={`/clinic/patients/${state.patient_id}?organization=${state.organization_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Patient record <ExternalLink aria-hidden className="size-4" />
              <span className="sr-only">in a new tab</span>
            </ButtonLink>
          )}
          {state.role === "patient" && state.aftercare && (
            <ReviewedNextSteps value={state.aftercare} timezone={state.timezone} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
