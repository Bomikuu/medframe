"use client";

import { Pencil, Building2 } from "lucide-react";
import {
  providerCounts,
  walkInPolicies,
  operatingDays,
  selectedProviderTypes,
} from "./review-labels";
import { useSavedLogo } from "./use-saved-logo";
import { Button } from "@/components/ui/button";
import { WorkspacePreview } from "./workspace-preview";
import type { Snapshot, Step, References } from "./schema";
export function ReviewStep({
  snapshot,
  references,
  onEdit,
  onComplete,
  busy,
  error,
}: {
  snapshot: Snapshot;
  references: References;
  onEdit: (step: Step) => void;
  onComplete: () => void;
  busy: boolean;
  error: string;
}) {
  const { clinic, specialties, branding, practice } = snapshot.data;
  const logo = useSavedLogo(snapshot.logo);
  const groups: [Step, string, [string, string][]][] = [
    [
      "clinic",
      "Clinic information",
      [
        ["Clinic", String(clinic.name)],
        [
          "Practice type",
          references.clinicTypes.find((item) => item.value === clinic.clinic_type)?.label ??
            "Not specified",
        ],
        ["Contact", `${clinic.email} · ${clinic.phone}`],
        [
          "Location",
          [clinic.street, clinic.city, clinic.region, clinic.country, clinic.postal_code]
            .filter(Boolean)
            .join(", ") || "Not specified",
        ],
      ],
    ],
    [
      "specialties",
      "Clinical capabilities",
      [
        [
          "Specialties",
          (specialties.codes as string[])
            .map((code) => references.specialties.find((item) => item.code === code)?.name ?? code)
            .join(", "),
        ],
        ["Provider types", selectedProviderTypes(specialties.provider_types)],
        [
          "Estimated providers",
          providerCounts[String(specialties.provider_count)] ?? "Not specified",
        ],
      ],
    ],
    [
      "branding",
      "Workspace branding",
      [
        ["Short name", String(branding.short_name || clinic.name)],
        ["Colors", `${branding.primary} · ${branding.secondary} · ${branding.accent}`],
        ["Logo", snapshot.logo ? `Security scan: ${snapshot.logo.state}` : "Clinic initials"],
      ],
    ],
    [
      "practice",
      "Practice details",
      [
        ["Branch", String(practice.branch_name)],
        ["Operating days", operatingDays(practice.days)],
        [
          "Hours",
          ((practice.days as number[]) ?? [])
            .map((day) => {
              const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
              const hours = (
                practice.daily_hours as
                  Record<string, { opens: string; closes: string }> | undefined
              )?.[String(day)] ?? { opens: practice.opens, closes: practice.closes };
              return `${names[day]} ${hours.opens}–${hours.closes}`;
            })
            .join(" · ") + ` (${practice.timezone})`,
        ],
        [
          "Appointment preference",
          `${practice.duration_minutes} minutes · ${walkInPolicies[String(practice.walk_in_policy)] ?? "Not specified"}`,
        ],
      ],
    ],
    [
      "account",
      "Administrator",
      [
        ["Name", snapshot.administrator_name || "Complete account verification"],
        ["Verified email", snapshot.email],
        [
          "Account",
          snapshot.account_ready ? "Account and MFA verified" : "Account verification required",
        ],
      ],
    ],
  ];
  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-2xl font-semibold wrap-anywhere">
          Review {String(clinic.name) || "your clinic"}
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
          Check the saved details below. Edit any section before creating your workspace.
        </p>
      </div>
      {groups.map(([step, title, rows]) => (
        <section key={step} className="rounded-xl border p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">{title}</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(step)}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit<span className="sr-only"> {title}</span>
            </Button>
          </div>
          <dl className="space-y-3">
            {rows.map(([label, value]) => (
              <div key={label} className="grid gap-1 text-sm sm:grid-cols-[150px_minmax(0,1fr)]">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="wrap-anywhere">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <WorkspacePreview
        name={String(clinic.name)}
        logo={logo}
        primary={String(branding.primary)}
        secondary={String(branding.secondary)}
        accent={String(branding.accent)}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs leading-6 text-muted-foreground">
        Creating the clinic applies this configuration and grants administrator access. It does not
        grant clinical credentials or create provider schedules.
      </p>
      <Button
        size="lg"
        disabled={
          busy ||
          !snapshot.account_ready ||
          (snapshot.logo !== null && snapshot.logo.state !== "clean")
        }
        onClick={onComplete}
      >
        <Building2 aria-hidden="true" />
        {busy ? "Creating your clinic…" : "Create my clinic"}
      </Button>
    </div>
  );
}
