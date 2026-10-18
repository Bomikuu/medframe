"use client";
import { useRef, useState, type ReactNode } from "react";
import { useFormContext, type FieldPath } from "react-hook-form";
import type { EncounterForm } from "@/features/consultations/schema";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
/** A local editor for one entry; persistence remains the consultation's single form. */
export function ClinicalEntry({
  title,
  summary,
  status,
  path,
  readOnly,
  children,
  onRemove,
}: {
  title: string;
  summary: string;
  status: string;
  path: FieldPath<EncounterForm>;
  readOnly: boolean;
  children: ReactNode;
  onRemove: () => void;
}) {
  const form = useFormContext<EncounterForm>();
  const [open, setOpen] = useState(!summary && !readOnly);
  const snapshot = useRef(structuredClone(form.getValues(path)));
  function edit() {
    snapshot.current = structuredClone(form.getValues(path));
    setOpen(true);
  }
  function cancel() {
    form.setValue(path, snapshot.current, { shouldDirty: true });
    setOpen(false);
    const previous = snapshot.current;
    if (
      previous &&
      typeof previous === "object" &&
      (("description" in previous && !previous.description) ||
        ("condition" in previous && !previous.condition) ||
        ("label" in previous && !previous.label))
    )
      onRemove();
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium wrap-anywhere">{summary || "Description needed"}</p>
        <div className="mt-2">
          <StatusBadge value={status} />
        </div>
      </div>
      <Button type="button" variant="outline" onClick={edit}>
        {readOnly ? "View" : "Edit"}
      </Button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) cancel();
          else edit();
        }}
      >
        <SheetContent className="w-full overflow-y-auto p-0 data-[state=closed]:hidden sm:max-w-xl">
          <SheetHeader className="border-b border-border p-6 pr-12">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              Review this entry, then save the consultation draft to persist it.
            </SheetDescription>
          </SheetHeader>
          <fieldset disabled={readOnly} className="p-6">
            {children}
          </fieldset>
          <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-border bg-card p-5">
            <Button type="button" variant="outline" onClick={cancel}>
              Cancel changes
            </Button>
            <Button type="button" onClick={() => setOpen(false)}>
              {readOnly ? "Done" : "Use entry"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
