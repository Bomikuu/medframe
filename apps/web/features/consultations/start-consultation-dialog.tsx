"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Stethoscope } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ButtonLink } from "@/components/ui/button-link";
import { AccessRequired } from "@/components/application/access-required";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety } from "@/features/workspace/safety-provider";
import { ConsultationSetup } from "./start-consultation-form";

export function ConsultationStartDialog() {
  const { organizationId, href, can } = useWorkspace();
  const { guard } = useSafety();
  const query = useSearchParams();
  const patientId = query.get("patient");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy)
          void guard(() => {
            router.replace(href(patientId ? `/clinic/patients/${patientId}` : "/clinic/patients"));
          });
      }}
    >
      <DialogContent
        showCloseButton={!busy}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl"
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogTitle className="flex items-center gap-2 text-xl">
          <Stethoscope aria-hidden className="size-5 text-teal-ink" />
          Start consultation
        </DialogTitle>
        <DialogDescription>
          Choose the provider and visit reason to open the consultation.
        </DialogDescription>
        {!can("encounters.write") ? (
          <AccessRequired
            title="Consultation access required"
            description="Your role does not permit starting a consultation."
          />
        ) : patientId ? (
          <ConsultationSetup
            key={`${organizationId}:${patientId}`}
            organizationId={organizationId}
            patientId={patientId}
            onBusyChange={setBusy}
          />
        ) : (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">Choose an authorized patient to begin.</p>
            <ButtonLink href={href("/clinic/patients")}>Choose patient</ButtonLink>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
