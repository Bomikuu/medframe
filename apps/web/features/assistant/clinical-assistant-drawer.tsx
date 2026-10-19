"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ClinicalAssistantPreview,
  type ClinicalAssistantContext,
} from "./clinical-assistant-preview";

export function ClinicalAssistantDrawer({
  open,
  onOpenChange,
  context,
  scopeKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: ClinicalAssistantContext;
  scopeKey?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        showCloseButton={false}
        aria-label="Medframe AI"
        className="inset-y-0 z-[150] gap-0 p-0 data-[side=right]:h-dvh data-[side=right]:w-[min(100vw,420px)] data-[side=right]:sm:max-w-[420px]"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.stopPropagation()}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Medframe AI</SheetTitle>
          <SheetDescription>
            Floating clinical assistant preview. Sending is unavailable.
          </SheetDescription>
        </SheetHeader>
        <ClinicalAssistantPreview
          key={scopeKey}
          context={context}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
