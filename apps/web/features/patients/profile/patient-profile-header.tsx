"use client";

import Link from "next/link";
import { Mail, MapPin, MoreHorizontal, Phone, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PatientAvatar } from "@/components/application/patient-avatar";
import type { PatientDetailsFragment } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { dateLabel } from "../feedback";
import { ageLabel } from "./summary";

export function PatientProfileHeader({
  patient,
  portraitId,
  timezone,
}: {
  patient: PatientDetailsFragment;
  portraitId?: string | null;
  timezone: string;
}) {
  const { href, can, workspace } = useWorkspace();
  const branch =
    workspace.branches.find((item) => item.id === patient.branchId)?.name ?? "Authorized branch";
  const age = ageLabel(patient.dateOfBirth ?? null, timezone);
  return (
    <header
      aria-label="Patient identity"
      className="flex min-w-0 flex-wrap items-start justify-between gap-5 py-1"
    >
      <div className="flex min-w-0 flex-1 basis-96 items-start gap-4 sm:gap-5">
        <PatientAvatar
          name={patient.fullName}
          imageId={portraitId ?? undefined}
          className="size-16 border-0 text-xl sm:size-20"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-bold text-foreground sm:text-[30px]">
            {patient.fullName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-5 text-muted-foreground">
            {patient.sex !== "not_recorded" && <span className="capitalize">{patient.sex}</span>}
            {age && <span>{age}</span>}
            {patient.dateOfBirth && <span>{dateLabel(patient.dateOfBirth)}</span>}
            <span>{patient.reference}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {patient.phone && (
              <a
                href={`tel:${patient.phone}`}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-foreground hover:bg-muted"
              >
                <Phone aria-hidden className="size-3.5 shrink-0 text-teal-ink" />
                {patient.phone}
              </a>
            )}
            {patient.email && (
              <a
                href={`mailto:${patient.email}`}
                className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 break-all text-foreground hover:bg-muted"
              >
                <Mail aria-hidden className="size-3.5 shrink-0 text-teal-ink" />
                {patient.email}
              </a>
            )}
            <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-muted-foreground">
              <MapPin aria-hidden className="size-3.5 shrink-0 text-teal-ink" />
              {branch}
            </span>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
        <ButtonLink variant="outline" href={href(`/clinic/patients/${patient.id}/history`)}>
          Patient record
        </ButtonLink>
        {can("patients.demographics.write") && (
          <ButtonLink variant="outline" href={href(`/clinic/patients/${patient.id}/edit`)}>
            Edit details
          </ButtonLink>
        )}
        {can("encounters.write") && (
          <ButtonLink href={`${href("/clinic/consultations/new")}&patient=${patient.id}`}>
            <Stethoscope />
            Start consultation
          </ButtonLink>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="More patient actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {can("patients.clinical.read") && (
              <DropdownMenuItem asChild>
                <Link href={`${href(`/clinic/patients/${patient.id}`)}&tab=documents`}>
                  Documents
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={href(`/clinic/patients/${patient.id}/history`)}>History</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
