"use client";

import type { ReactNode } from "react";
import { CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/** Keep appointment changes in the current viewport; the native form owns the save. */
export function AppointmentEditorDialog({
  children,
  close,
}: {
  children: ReactNode;
  close: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <div className="grid gap-2 border-b border-border p-5 pr-12 sm:p-7 sm:pr-14">
          <DialogTitle className="flex items-center gap-2 pr-8 text-xl">
            <CalendarDays aria-hidden className="size-5 text-teal-ink" />
            Edit appointment
          </DialogTitle>
          <DialogDescription>
            Change the appointment date, available time or duration. Your existing booking stays in
            place until you save.
          </DialogDescription>
        </div>
        <div className="@container min-w-0 p-5 sm:p-7">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
