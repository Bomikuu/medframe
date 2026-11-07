"use client";

import { FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { SpecialtySetup } from "./schema";

export function StarterPreview({
  code,
  setup,
  close,
}: {
  code: string;
  setup: SpecialtySetup;
  close: () => void;
}) {
  const option = setup.catalog.find((row) => row.code === code);
  const starter = (setup.starter_catalog ?? setup.starters).find((row) => row.specialty === code);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle className="flex items-center gap-2">
          <FileText aria-hidden className="size-5 text-teal-ink" />
          {option?.name ?? "Specialty"} documentation
        </DialogTitle>
        <DialogDescription>
          Enabling a clinic specialty makes it available for new templates. It does not assign a
          doctor, verify credentials, create a template or change existing consultations.
        </DialogDescription>
        {starter ? (
          <>
            <p className="text-xs text-muted-foreground">
              Medframe built-in documentation starter
              {setup.starter_revision ? ` · Content revision ${setup.starter_revision}` : ""}.
              Clinic templates keep their own saved versions.
            </p>
            <dl className="grid gap-4">
              {Object.entries(starter.prompts).map(([label, prompt]) => (
                <div key={label} className="border-t border-border pt-4">
                  <dt className="text-sm font-semibold capitalize">{label}</dt>
                  <dd className="mt-2 text-sm leading-6 text-muted-foreground">{prompt}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold">Suggested observation labels</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {starter.observation_labels.join(" · ") || "No suggested labels"}
              </p>
            </div>
          </>
        ) : (
          <p className="rounded-lg bg-muted/40 p-4 text-sm leading-6">
            No built-in documentation starter is supplied for this specialty. Your team can create
            its own prompts in Consultation templates after enabling it.
          </p>
        )}
        <p className="text-xs leading-5 text-muted-foreground">
          These are documentation prompts, not a care protocol, diagnosis or clinical validation.
          The clinician records and reviews the actual findings.
        </p>
      </DialogContent>
    </Dialog>
  );
}
