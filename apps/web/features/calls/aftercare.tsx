"use client";

import { useState } from "react";
import { ClipboardCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { callDate } from "./call-format";
import type { Aftercare, CallState } from "./client";

export function ReviewedNextSteps({ value, timezone }: { value: Aftercare; timezone?: string }) {
  return (
    <section
      className="rounded-xl border border-border bg-card p-5 text-left"
      aria-label="Reviewed next steps"
    >
      <h2 className="flex items-center gap-2 font-semibold">
        <ClipboardCheck aria-hidden className="size-5 text-teal-ink" />
        Reviewed next steps
      </h2>
      <p className="mt-3 text-sm leading-7 wrap-anywhere whitespace-pre-wrap">{value.next_steps}</p>
      {value.follow_up && (
        <>
          <h3 className="mt-5 text-sm font-semibold">Follow-up guidance</h3>
          <p className="mt-2 text-sm leading-6 wrap-anywhere whitespace-pre-wrap">
            {value.follow_up}
          </p>
        </>
      )}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Shared by {value.author} · {callDate(value.reviewed_at, timezone)}
      </p>
    </section>
  );
}

export function AftercareComposer({
  state,
  busy,
  publish,
}: {
  state: CallState;
  busy: boolean;
  publish: (steps: string, followUp: string) => Promise<boolean>;
}) {
  const [steps, setSteps] = useState(state.aftercare?.next_steps ?? "");
  const [followUp, setFollowUp] = useState(state.aftercare?.follow_up ?? "");
  const [baseline, setBaseline] = useState([steps, followUp].join("\n"));
  const [review, setReview] = useState(false);
  const [shareError, setShareError] = useState("");
  useUnsavedChanges(
    `call:${state.id}:next-steps`,
    baseline !== [steps, followUp].join("\n"),
    () => {},
  );
  return (
    <section className="grid gap-4 border-t border-border pt-6">
      <div>
        <h2 className="font-semibold">Patient-facing next steps</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Write only the instructions you have reviewed for this patient. Sharing here does not
          release clinical notes or documents, book a follow-up or finalize the consultation.
        </p>
      </div>
      <div className="grid gap-2">
        <label htmlFor="call-next-steps" className="text-sm font-medium">
          Next steps
        </label>
        <Textarea
          id="call-next-steps"
          rows={5}
          maxLength={2000}
          value={steps}
          onChange={(event) => setSteps(event.target.value)}
          placeholder="Enter the instructions you want the patient to see."
        />
        <p className="text-right text-xs text-muted-foreground">
          {steps.length.toLocaleString()} / 2,000
        </p>
      </div>
      <div className="grid gap-2">
        <label htmlFor="call-follow-up" className="text-sm font-medium">
          Follow-up guidance <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="call-follow-up"
          rows={3}
          maxLength={500}
          value={followUp}
          onChange={(event) => setFollowUp(event.target.value)}
          placeholder="When to arrange a follow-up and how to contact the clinic."
        />
      </div>
      <Button
        className="justify-self-start"
        disabled={busy || !steps.trim()}
        onClick={() => {
          setShareError("");
          setReview(true);
        }}
      >
        <ClipboardCheck aria-hidden className="size-4" />
        Review & share
      </Button>
      {state.aftercare && (
        <p className="text-xs leading-5 text-muted-foreground">
          A reviewed version has been shared. Changes above stay private until you share again.
        </p>
      )}
      <Dialog
        open={review}
        onOpenChange={(open) => {
          if (!busy) setReview(open);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogTitle>Share these next steps with {state.patient ?? "the patient"}?</DialogTitle>
          <DialogDescription>
            This is the exact patient-facing text. Review it before sharing with the admitted
            participant.
          </DialogDescription>
          <div className="rounded-lg bg-muted p-4 text-sm leading-7 wrap-anywhere whitespace-pre-wrap">
            {steps}
            {followUp && (
              <>
                <h3 className="mt-4 font-semibold">Follow-up guidance</h3>
                {followUp}
              </>
            )}
          </div>
          {shareError && (
            <p role="alert" className="text-sm text-destructive">
              {shareError}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" disabled={busy} onClick={() => setReview(false)}>
              Keep editing
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (await publish(steps, followUp)) {
                  setBaseline([steps, followUp].join("\n"));
                  setReview(false);
                } else
                  setShareError(
                    "Next steps were not shared. Your input is kept. Check room access and try again while the appointment remains open.",
                  );
              }}
            >
              <Send aria-hidden className="size-4" />
              {busy ? "Sharing…" : "Share reviewed next steps"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
