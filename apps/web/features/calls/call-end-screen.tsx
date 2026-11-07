"use client";

import { PhoneOff, ClipboardPenLine, CalendarDays, FileCheck2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { ReviewedNextSteps } from "./aftercare";
import type { CallState } from "./client";

export function CallEndScreen({
  state,
  left,
  reason,
  error,
  returnToRoom,
  openClinical,
}: {
  state: CallState | null;
  left: boolean;
  reason: string;
  error: string;
  returnToRoom: () => void;
  openClinical: () => void;
}) {
  const doctor = state?.role === "doctor";
  const removed = reason === "WAITING_REMOVED";
  const showSummary = !left && !removed && state?.aftercare && ["", "ROOM_ENDED"].includes(reason);
  return (
    <main id="main" className="grid min-h-svh place-items-center bg-background px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-3xl gap-5">
        <section className="grid justify-items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
          <span className="grid size-16 place-items-center rounded-full bg-teal-50 text-teal-ink">
            <PhoneOff aria-hidden className="size-7" />
          </span>
          <h1 className="text-2xl font-semibold">
            {left
              ? "You left the appointment"
              : removed
                ? "Your waiting session was closed"
                : "This appointment room has ended"}
          </h1>
          <p className="max-w-prose text-sm leading-7 text-muted-foreground">
            {left
              ? "Your camera and microphone are disconnected. You can return while the appointment remains open."
              : error || "Camera, microphone, conversation and room file access are now closed."}
          </p>
          {left && (
            <Button onClick={returnToRoom}>
              <ArrowLeft aria-hidden className="size-4" />
              Return to room
            </Button>
          )}
          {removed && <Button onClick={() => location.reload()}>Return to PIN entry</Button>}
          {doctor && (
            <>
              <p className="text-sm leading-6 text-muted-foreground">
                Ending the call does not save or finalize clinical notes. Review your consultation
                in the clinical workspace.
              </p>
              <Button onClick={openClinical}>
                <ClipboardPenLine aria-hidden className="size-4" />
                Continue clinical notes
              </Button>
            </>
          )}
        </section>
        {showSummary && <ReviewedNextSteps value={state.aftercare!} timezone={state.timezone} />}
        {!left && !removed && !showSummary && !doctor && (
          <p className="px-2 text-sm leading-7 text-muted-foreground">
            No reviewed next steps were received in this room. Check your patient portal or contact
            the clinic for instructions.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <ButtonLink
            variant="outline"
            href={
              doctor
                ? `/clinic/appointments?organization=${state?.organization_id}`
                : "/portal/appointments"
            }
          >
            <CalendarDays aria-hidden className="size-4" />
            {doctor ? "Appointments & follow-up" : "Arrange a follow-up"}
          </ButtonLink>
          <ButtonLink
            variant="outline"
            href={
              doctor
                ? `/clinic/patients/${state?.patient_id}?organization=${state?.organization_id}`
                : "/portal"
            }
          >
            <FileCheck2 aria-hidden className="size-4" />
            {doctor ? "Patient record" : "Released records & documents"}
          </ButtonLink>
        </div>
        <p className="px-2 text-xs leading-6 text-muted-foreground">
          {doctor
            ? "Patient records and editing still require your current clinical permissions."
            : "The patient portal requires your own account. Only explicitly released records are available there. Follow-up booking is separate; no appointment has been created automatically."}
        </p>
      </div>
    </main>
  );
}
