"use client";

import type { ReactNode, RefObject } from "react";
import { ArrowLeftRight, LayoutGrid, MapPin, Phone } from "lucide-react";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { Button } from "@/components/ui/button";
import { ageLabel } from "@/features/patients/profile/summary";
import { dateLabel } from "@/features/patients/feedback";

export function StationPatientHeader({
  patient,
  portraitId,
  branch,
  timezone,
  actions,
  switchPatient,
  trigger,
  photo,
}: {
  patient: {
    fullName: string;
    reference: string;
    dateOfBirth?: string | null;
    phone?: string | null;
  };
  portraitId?: string | null;
  branch: string;
  timezone: string;
  actions: () => void;
  switchPatient: () => void;
  trigger: RefObject<HTMLButtonElement | null>;
  photo?: ReactNode;
}) {
  return (
    <header
      aria-label="Selected patient"
      className="sticky top-[var(--station-session-offset,0px)] z-20 flex min-w-0 flex-wrap items-center justify-between gap-5 rounded-2xl border border-border bg-card p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-1 basis-80 items-center gap-4">
        {photo ?? (
          <PatientAvatar
            name={patient.fullName}
            imageId={portraitId ?? undefined}
            className="size-20 text-2xl"
          />
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold wrap-anywhere">{patient.fullName}</h1>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            {patient.reference}
            {patient.dateOfBirth && (
              <>
                {" "}
                · {ageLabel(patient.dateOfBirth, timezone)} · {dateLabel(patient.dateOfBirth)}
              </>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden className="size-3.5" />
              {branch}
            </span>
            {patient.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone aria-hidden className="size-3.5" />
                {patient.phone}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="min-h-12" onClick={switchPatient}>
          <ArrowLeftRight aria-hidden className="size-4" />
          Switch patient
        </Button>
        <Button ref={trigger} className="min-h-12" onClick={actions}>
          <LayoutGrid aria-hidden className="size-4" />
          Patient actions
        </Button>
      </div>
    </header>
  );
}
