"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ManageAction } from "./staff-dialogs";

export type Intake = {
  id: string;
  name: string;
  phone: string;
  date_of_birth: string | null;
  version: number;
  created_at: string;
};

export function RegistrationRequests({
  intakes,
  busy,
  verified,
  patient,
  run,
}: {
  intakes: Intake[];
  busy: boolean;
  verified: boolean;
  patient: string;
  run: ManageAction;
}) {
  return (
    <section
      aria-label="Registration review"
      className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-info-soft text-info">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <h2 className="text-base font-semibold">Registration requests</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Check identity and duplicates. To link a request, first select the verified existing patient
        above. A request never creates or links a record on its own.
      </p>
      <div className="mt-5 grid gap-5">
        {intakes.map((row) => (
          <div key={row.id} className="border-b border-border pb-5">
            <h3 className="font-semibold">{row.name}</h3>
            <p className="mt-2 text-sm">
              {row.phone}
              {row.date_of_birth ? ` · Born ${row.date_of_birth}` : ""} · Reference{" "}
              {row.id.slice(0, 8).toUpperCase()}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={busy || !verified || !patient}
                onClick={() =>
                  void run({
                    action: "review_intake",
                    intake_id: row.id,
                    expected_version: row.version,
                    patient_id: patient,
                    identity_verified: true,
                  })
                }
              >
                Link verified selected patient
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      `Identity verified and duplicate search completed for ${row.name}? This creates a new patient record.`,
                    )
                  )
                    void run({
                      action: "review_intake",
                      intake_id: row.id,
                      expected_version: row.version,
                      decision: "create",
                      identity_verified: true,
                    });
                }}
              >
                Verify and register new patient
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void run({
                    action: "review_intake",
                    intake_id: row.id,
                    expected_version: row.version,
                    decision: "reject",
                  })
                }
              >
                Decline request
              </Button>
            </div>
          </div>
        ))}
      </div>
      {!intakes.length && (
        <div className="mt-5 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-5 py-8 text-center">
          <FileText className="mb-4 size-7 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">No requests awaiting review</p>
          <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
            New patient registration requests from kiosks will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
