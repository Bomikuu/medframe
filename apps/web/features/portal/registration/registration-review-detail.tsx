"use client";

import { useState } from "react";
import { AlertCircle, ArrowLeft, Check, MailCheck, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSelect } from "@/features/patients/form-controls";
import type { RegistrationRequest } from "./review-client";
import { dateLabel } from "@/features/patients/calendar-date";

export function RegistrationReviewDetail({
  row,
  busy,
  canCreate,
  onBack,
  onReview,
}: {
  row: RegistrationRequest;
  busy: boolean;
  canCreate: boolean;
  onBack: () => void;
  onReview: (
    row: RegistrationRequest,
    decision: "accept" | "decline",
    patient: string,
  ) => Promise<void>;
}) {
  const [verified, setVerified] = useState(false);
  const [patient, setPatient] = useState("");
  const [declining, setDeclining] = useState(false);
  return (
    <div className="space-y-5">
      <Button size="sm" variant="ghost" disabled={busy} onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        All requests
      </Button>
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal-ink">
          <UserRound aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold break-words">{row.full_name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {row.relationship === "guardian"
              ? `Guardian request · ${row.contact_name}`
              : "Registering themselves"}
          </p>
        </div>
      </div>
      <dl className="grid gap-4 rounded-xl border p-4 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MailCheck className="size-3.5" aria-hidden="true" />
            {row.email_verified ? "Verified email" : "Email for portal invitation"}
          </dt>
          <dd className="break-all">{row.email}</dd>
        </div>
        <div>
          <dt className="mb-1 text-xs text-muted-foreground">Patient phone</dt>
          <dd>{row.phone || "Not provided"}</dd>
          {row.verified_mobile && (
            <p className="mt-1 text-xs text-teal-800 dark:text-teal-300">
              Verified contact mobile: {row.verified_mobile}
            </p>
          )}
        </div>
        <div>
          <dt className="mb-1 text-xs text-muted-foreground">Date of birth</dt>
          <dd>{row.date_of_birth ? dateLabel(row.date_of_birth) : "Not provided"}</dd>
        </div>
        <div>
          <dt className="mb-1 text-xs text-muted-foreground">Sex</dt>
          <dd className="capitalize">{row.sex.replaceAll("_", " ")}</dd>
        </div>
      </dl>
      {row.possible_duplicate ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <p className="flex items-center gap-2 font-medium">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            Possible existing patient
          </p>
          <p className="mt-2 text-xs leading-6">
            Confirm the patient’s identity before linking. Creating another record is blocked while
            a possible match needs review.
          </p>
          {row.matches.length ? (
            <div className="mt-3">
              <FormSelect
                id="application-matching-patient"
                label="Link to verified existing patient"
                personKind="patient"
                value={patient}
                onChange={setPatient}
                options={[
                  { value: "", label: "Choose a matching record" },
                  ...row.matches.map((match) => ({
                    value: match.id,
                    label: `${match.name} · ${match.reference}`,
                  })),
                ]}
              />
            </div>
          ) : (
            <p className="mt-2 text-xs leading-6">
              No matching record is within your patient access. Ask authorized clinic staff to
              review this request.
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-xl bg-muted/50 p-4 text-sm leading-6">
          Acceptance creates a new patient record in this branch and queues a portal invitation.
          Email delivery and account activation are separate steps.{" "}
          {canCreate
            ? ""
            : "Your account cannot create new patient records; ask authorized clinic staff."}
        </p>
      )}
      {declining ? (
        <div className="space-y-4 rounded-xl border p-4">
          <p className="text-sm leading-6">
            Decline this request? No patient record or portal access will be created.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              variant="destructive"
              onClick={() => void onReview(row, "decline", "")}
            >
              Confirm decline
            </Button>
            <Button disabled={busy} variant="outline" onClick={() => setDeclining(false)}>
              Keep reviewing
            </Button>
          </div>
        </div>
      ) : (
        <>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-6">
            <Checkbox
              checked={verified}
              onCheckedChange={(value) => setVerified(value === true)}
              disabled={busy}
              className="mt-0.5 shrink-0"
            />
            <span>
              I checked the patient’s identity
              {row.relationship === "guardian"
                ? " and this person’s authority as guardian"
                : ""}{" "}
              and confirmed this request belongs to them.
            </span>
          </label>
          <div className="flex flex-wrap justify-between gap-3 border-t pt-5">
            <Button variant="ghost" disabled={busy} onClick={() => setDeclining(true)}>
              <X aria-hidden="true" />
              Decline
            </Button>
            <Button
              disabled={busy || !verified || (row.possible_duplicate ? !patient : !canCreate)}
              onClick={() => void onReview(row, "accept", patient)}
            >
              <Check aria-hidden="true" />
              {busy ? "Saving…" : "Accept & send portal access"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
