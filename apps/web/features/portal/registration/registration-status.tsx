"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, Copy, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApplicationStatus } from "./registration-client";

export function RegistrationStatus({
  application,
  clinic,
  busy,
  onRefresh,
}: {
  application: ApplicationStatus;
  clinic: string;
  busy: boolean;
  onRefresh: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const accepted = application.state === "accepted";
  const declined = application.state === "declined";
  const Icon = accepted ? CheckCircle2 : declined ? XCircle : Clock3;
  return (
    <div className="grid gap-6">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-teal-soft text-teal-ink">
          <Icon aria-hidden className="size-7" />
        </span>
        <h2
          id="registration-stage-title"
          tabIndex={-1}
          className="mt-5 text-xl font-semibold outline-none"
        >
          {accepted
            ? "Your registration was accepted"
            : declined
              ? "Your clinic needs to help you"
              : "Your request is with the clinic"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {accepted
            ? "Your clinic has accepted your details. Use the portal invitation to finish account setup; registration alone does not sign you in."
            : declined
              ? `Contact ${clinic} to check your details or arrange registration in person. No patient access was created from this request.`
              : `${clinic} will review your details and check your identity. You don’t need to submit another request.`}
        </p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Request reference</p>
          <p className="mt-1 text-sm font-semibold break-all">{application.reference}</p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(application.reference);
              setCopyStatus("Request reference copied.");
            } catch {
              setCopyStatus("Select the reference above and copy it manually.");
            }
          }}
        >
          <Copy aria-hidden className="size-4" />
          Copy reference
        </Button>
      </div>
      {copyStatus && (
        <p role="status" className="text-sm text-muted-foreground">
          {copyStatus}
        </p>
      )}
      {!declined && (
        <div className="text-sm leading-7">
          <h3 className="font-semibold">What happens next</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
            {!accepted && (
              <li>Clinic staff review your request. Your reference helps them find it.</li>
            )}
            <li>
              {accepted
                ? "Look for your portal invitation. If it is missing, ask the clinic to check delivery or share the invitation link."
                : "After acceptance, the clinic queues your portal invitation for email delivery."}
            </li>
            <li>
              Verify and secure your account before opening patient records. This request does not
              book an appointment.
            </li>
          </ul>
        </div>
      )}
      <p className="border-t border-border pt-4 text-xs leading-6 text-muted-foreground">
        Keep your clinic’s registration link. Return to check progress; contact verification may be
        required again. If you need help, give reception your request reference.
      </p>
      <Button variant="outline" disabled={busy} onClick={onRefresh} className="w-full sm:w-fit">
        <RefreshCw aria-hidden className={busy ? "animate-spin motion-reduce:animate-none" : ""} />
        {busy ? "Checking status…" : "Check status"}
      </Button>
    </div>
  );
}
