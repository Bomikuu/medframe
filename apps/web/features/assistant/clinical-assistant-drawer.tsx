"use client";

import { useRef } from "react";

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
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        showCloseButton={false}
        aria-label="Medframe AI"
        className="inset-y-0 z-[150] gap-0 p-0 data-[side=right]:h-dvh data-[side=right]:w-[min(100vw,420px)] data-[side=right]:sm:max-w-[420px]"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.stopPropagation()}
        onOpenAutoFocus={() => {
          opener.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
        }}
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
