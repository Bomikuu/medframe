"use client";

import type { ReactNode } from "react";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { StatusBadge } from "@/components/application/status-badge";
import { ArrowLeftIcon } from "@/components/icons";

export function DentalEditorHeader({
  patientName,
  reason,
  status,
  actions,
  feedback,
  navigation,
  pending,
  onExit,
  inspectorOpen,
  onInspector,
}: {
  patientName: string;
  reason: string;
  status: string;
  actions: ReactNode;
  feedback: ReactNode;
  navigation: ReactNode;
  pending: boolean;
  onExit: () => void;
  inspectorOpen: boolean;
  onInspector: () => void;
}) {
  return (
    <>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 xl:px-6">
        <div className="flex min-w-0 items-center gap-3 xl:gap-5">
          <Button type="button" variant="ghost" onClick={onExit} aria-label="Back to consultation">
            <ArrowLeftIcon />
            <span className="hidden xl:inline">Back to consultation</span>
          </Button>
          <div className="flex min-w-0 items-center gap-3 border-l border-border pl-3 xl:pl-5">
            <PatientAvatar name={patientName} />
            <div className="min-w-0">
              <DialogTitle className="truncate text-sm font-semibold">{patientName}</DialogTitle>
              <DialogDescription
                id="dental-editor-description"
                className="mt-1 max-w-64 truncate text-xs"
              >
                {reason}
              </DialogDescription>
            </div>
          </div>
          <div className="hidden items-center gap-3 xl:flex">
            <StatusBadge value={status} />
            <div className="max-w-64 text-xs text-muted-foreground" role="status">
              {feedback}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="lg:hidden"
            onClick={onInspector}
            aria-expanded={inspectorOpen}
          >
            Tooth details
          </Button>
          <fieldset disabled={pending} className="flex items-center gap-2">
            {actions}
          </fieldset>
        </div>
      </header>
      <nav
        aria-label="Consultation sections"
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-card px-4"
      >
        {navigation}
      </nav>
      <div
        className={`${pending ? "block" : "xl:hidden"} shrink-0 border-b border-border px-4 py-2 text-xs`}
        role="status"
      >
        {feedback}
        {pending && <span className="ml-3">Add or cancel the pending note before saving.</span>}
      </div>
    </>
  );
}
