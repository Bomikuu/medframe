"use client";

import { HeartPulse, Pill, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClinicalRecordDocument } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useClinicTime } from "@/components/application/clinical-locale";
import { useRemote } from "../use-remote";
import { RemoteNotice } from "../feedback";
import { LoadingInformation } from "@/components/application/loading-information";
import { RecoveryState } from "@/components/application/recovery-state";
import { reviewLabel } from "../clinical-summary";
import { cn } from "@/lib/utils";

export function ProfileClinicalContext({
  patientId,
  onReview,
}: {
  patientId: string;
  onReview: () => void;
}) {
  const { organizationId, can } = useWorkspace();
  const timeLabel = useClinicTime();
  const remote = useRemote(ClinicalRecordDocument, { organizationId, patientId });
  const revision = remote.data?.patientClinicalHistory;
  const needsAllergyReview = !revision || revision.allergyState === "unreviewed";
  const allergyAttention = needsAllergyReview || !!revision?.allergies.length;
  return (
    <section
      aria-label="Clinical overview"
      className="@container rounded-xl border border-border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-teal-soft/35 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <HeartPulse aria-hidden className="size-5 text-teal-ink" />
            Clinical overview
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {revision
              ? `History version ${revision.version} · ${timeLabel(revision.createdAt)}`
              : "Allergies, medications and relevant history at a glance."}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onReview}>
          {can("patients.clinical.write") ? "Review history" : "View history"}
        </Button>
      </div>
      {!remote.data ? (
        <div className="grid min-h-48 place-items-center p-5">
          {remote.error ? (
            <RecoveryState
              compact
              title="History could not be loaded"
              description="Retry to check allergies, medications and history. No review state has been assumed."
            >
              <Button variant="outline" onClick={remote.reload}>
                Retry history
              </Button>
            </RecoveryState>
          ) : (
            <LoadingInformation
              title="Loading clinical history"
              detail="Retrieving recorded allergies, medications and history review states."
            />
          )}
        </div>
      ) : (
        <div className="p-5">
          <RemoteNotice error={remote.error} retry={remote.reload} />
          {(needsAllergyReview || revision?.medicationState === "unreviewed" || !revision) && (
            <p
              role="status"
              className="mb-4 rounded-lg bg-warning-soft/60 p-3 text-sm leading-6 text-warning"
            >
              History review needed:{" "}
              {[
                needsAllergyReview ? "allergies" : null,
                !revision || revision.medicationState === "unreviewed" ? "medications" : null,
              ]
                .filter(Boolean)
                .join(" and ")}
              . Unreviewed information does not mean none reported.
            </p>
          )}
          <div className="grid gap-5 @lg:grid-cols-2">
            <section
              className={cn(
                "rounded-lg border p-4",
                allergyAttention
                  ? "border-warning/25 bg-warning-soft/60"
                  : "border-success/25 bg-success-soft/50",
              )}
            >
              <h3
                className={cn(
                  "flex items-center gap-2 text-sm font-semibold",
                  allergyAttention ? "text-warning" : "text-success",
                )}
              >
                <ShieldAlert aria-hidden className="size-4" />
                Allergies
              </h3>
              <p className="mt-2 text-sm leading-6">
                {reviewLabel(revision?.allergyState ?? "unreviewed", "allergy")}
              </p>
              {!!revision?.allergies.length && (
                <ul className="mt-3 grid gap-3 text-sm">
                  {revision.allergies.map((item, i) => (
                    <li key={i}>
                      <p className="font-semibold">
                        {item.substance} · {item.severity}
                      </p>
                      {item.reaction && <p className="mt-1 leading-6">{item.reaction}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-lg border border-info/20 bg-info-soft/40 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-info">
                <Pill aria-hidden className="size-4" />
                Current medications
              </h3>
              <p className="mt-2 text-sm leading-6">
                {reviewLabel(revision?.medicationState ?? "unreviewed", "medication")}
              </p>
              {!!revision?.medications.length && (
                <ul className="mt-3 grid gap-3 text-sm">
                  {revision.medications.map((item, i) => (
                    <li key={i}>
                      <p className="font-semibold">{item.name}</p>
                      <p className="mt-1 leading-6">
                        {[item.dose, item.frequency].filter(Boolean).join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          <dl className="mt-5 grid gap-5 text-sm @xl:grid-cols-3">
            {[
              ["Relevant conditions", revision?.conditions],
              ["Medical history", revision?.medicalHistory],
              ["Past procedures", revision?.pastProcedures],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="font-semibold">{label}</dt>
                <dd className="mt-2 leading-6 whitespace-pre-wrap text-muted-foreground">
                  {value || "Not recorded"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
