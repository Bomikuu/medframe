"use client";
import type { ReactNode } from "react";
import { ArrowLeft, MoreHorizontal, Check, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PatientAvatar } from "@/components/application/patient-avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { PatientRecordDocument } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
export type AnatomyConsultation = {
  patientName: string;
  patientId?: string;
  status: string;
  saveStatus: string;
  editingNotice?: string;
  busy: boolean;
  canComplete: boolean;
  canFinalize: boolean;
  onComplete: () => void;
  onFinalize: () => void;
  onBack: () => void;
  error?: string;
  stationActions?: ReactNode;
  navigation?: ReactNode;
  clinicalContext?: ReactNode;
};
export function AnatomyHeader({
  consultation,
  readOnly,
  active,
  save,
  onHistory,
}: {
  consultation: AnatomyConsultation;
  readOnly: boolean;
  active: boolean;
  save: () => Promise<unknown>;
  onHistory: () => void;
}) {
  const { organizationId } = useWorkspace();
  const patient = useRemote(
    PatientRecordDocument,
    { organizationId, patientId: consultation.patientId ?? "" },
    { enabled: active && !!consultation.patientId },
  ).data?.patientDemographics;
  const state = consultation.status.replaceAll("_", " ");
  return (
    <>
      <header
        className="flex shrink-0 flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-border bg-card px-4 py-3 sm:px-5"
        aria-label="Anatomy consultation header"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={consultation.onBack}
            className="shrink-0 px-0"
          >
            <ArrowLeft />
            <span className="hidden sm:inline">Consultation</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="hidden h-9 w-px bg-border sm:block" />
          <div className="flex min-w-0 items-center gap-3">
            <PatientAvatar name={consultation.patientName} className="size-10 shrink-0" />
            <div className="min-w-0">
              <p className="max-w-[240px] truncate text-sm font-semibold">
                {consultation.patientName}
              </p>
              <p className="mt-1 max-w-[280px] truncate text-[11px] text-muted-foreground">
                {patient
                  ? `${patient.sex === "not_recorded" ? "Sex not recorded" : patient.sex} · ${patient.reference}`
                  : "Patient consultation"}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <span className="bg-teal-wash inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-teal-ink capitalize">
              {readOnly ? <LockKeyhole className="size-3" /> : <Check className="size-3" />}
              {state}
            </span>
            <p role="status" className="max-w-[230px] truncate text-[11px] text-muted-foreground">
              {consultation.saveStatus}
            </p>
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {consultation.stationActions}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                aria-label="More anatomy actions"
                className="hidden lg:inline-flex"
              >
                <MoreHorizontal />
                More actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[90]">
              <DropdownMenuItem onSelect={onHistory}>Patient anatomy history</DropdownMenuItem>
              <DropdownMenuItem onSelect={consultation.onBack}>
                Back to consultation notes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              disabled={consultation.busy}
              onClick={() => void save()}
              className="text-xs sm:text-sm"
            >
              Save draft
            </Button>
          )}
          {consultation.canFinalize ? (
            <Button
              type="button"
              disabled={consultation.busy}
              onClick={consultation.onFinalize}
              className="text-xs sm:text-sm"
            >
              Finalize consultation
            </Button>
          ) : consultation.canComplete ? (
            <Button
              type="button"
              disabled={consultation.busy}
              onClick={consultation.onComplete}
              className="text-xs sm:text-sm"
            >
              Mark completed
            </Button>
          ) : (
            <span className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Read only
            </span>
          )}
        </div>
        {consultation.error && (
          <p role="alert" className="w-full text-xs text-destructive">
            {consultation.error}
          </p>
        )}
        <p role="status" className="w-full text-[11px] text-muted-foreground md:hidden">
          {state} · {consultation.saveStatus}
        </p>
      </header>
      <p
        role="status"
        className="shrink-0 border-b border-border bg-card px-4 py-2 text-xs font-medium sm:px-5"
      >
        {consultation.editingNotice ??
          (readOnly
            ? "Read only · changes cannot be recorded from this view."
            : "Editing this consultation draft")}
      </p>
      {consultation.navigation}
      {consultation.clinicalContext}
    </>
  );
}
