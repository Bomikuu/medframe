"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ClipboardPenLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ClinicalPanelFrame({
  open,
  close,
  patient,
  children,
}: {
  open: boolean;
  close: () => void;
  patient: string;
  children: ReactNode;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (open) title.current?.focus();
  }, [open]);
  return (
    <aside
      hidden={!open}
      aria-labelledby="call-clinical-heading"
      className="fixed inset-y-0 right-0 z-40 w-full max-w-5xl border-l border-border bg-background shadow-2xl"
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-border bg-card p-4 sm:px-6">
          <div>
            <h2
              id="call-clinical-heading"
              ref={title}
              tabIndex={-1}
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <ClipboardPenLine aria-hidden className="size-5 text-teal-ink" />
              Clinical workspace
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {patient} · Private to clinical staff
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Collapse clinical workspace"
            onClick={close}
          >
            <X aria-hidden className="size-5" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </aside>
  );
}
