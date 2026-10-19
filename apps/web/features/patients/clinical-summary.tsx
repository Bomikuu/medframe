"use client";

import { useClinicTime } from "@/components/application/clinical-locale";
import type { ClinicalDetailsFragment } from "@/lib/graphql/generated";

export function reviewLabel(state: string, kind: "allergy" | "medication") {
  if (state === "none_reported")
    return kind === "allergy" ? "No known allergies reported" : "No current medication reported";
  if (state === "recorded")
    return kind === "allergy" ? "Allergies recorded" : "Medications recorded";
  return "Not reviewed";
}

export function ClinicalSummary({ revision }: { revision: ClinicalDetailsFragment | null }) {
  const timeLabel = useClinicTime();
  return (
    <div className="grid gap-6 text-sm leading-6">
      {revision && (
        <p className="text-xs text-muted-foreground">
          Version {revision.version} · {revision.authorName} · {timeLabel(revision.createdAt)}
        </p>
      )}
      <div className="grid gap-5 @lg:grid-cols-2">
        <div>
          <h3 className="font-semibold">Allergies</h3>
          <p className="mt-1 text-muted-foreground">
            {reviewLabel(revision?.allergyState ?? "unreviewed", "allergy")}
          </p>
          {!!revision?.allergies.length && (
            <ul className="mt-2 grid gap-2">
              {revision.allergies.map((item, index) => (
                <li key={index} className="wrap-anywhere">
                  <span className="font-medium">{item.substance}</span> · {item.severity}
                  {item.reaction && ` · ${item.reaction}`}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="font-semibold">Current medications</h3>
          <p className="mt-1 text-muted-foreground">
            {reviewLabel(revision?.medicationState ?? "unreviewed", "medication")}
          </p>
          {!!revision?.medications.length && (
            <ul className="mt-2 grid gap-2">
              {revision.medications.map((item, index) => (
                <li key={index} className="wrap-anywhere">
                  <span className="font-medium">{item.name}</span>
                  {item.dose && ` · ${item.dose}`}
                  {item.frequency && ` · ${item.frequency}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {revision &&
        [
          ["Medical history", revision.medicalHistory],
          ["Relevant conditions", revision.conditions],
          ["Past procedures", revision.pastProcedures],
          ["Revision reason", revision.reason],
        ]
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label}>
              <h3 className="font-semibold">{label}</h3>
              <p className="mt-1 wrap-anywhere whitespace-pre-wrap text-muted-foreground">
                {value}
              </p>
            </div>
          ))}
    </div>
  );
}
