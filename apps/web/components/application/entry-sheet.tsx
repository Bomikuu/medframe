"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useSafety } from "@/features/workspace/safety-provider";
const EntrySheetActions = createContext<{ cancel: () => void; complete: () => void } | null>(null);
export const useEntrySheetActions = () => useContext(EntrySheetActions);
/** Embed the same form actions in an existing patient workspace without another sheet. */
export function EntryFormActions({
  children,
  cancel,
  complete,
}: {
  children: ReactNode;
  cancel: () => void;
  complete: () => void;
}) {
  return (
    <EntrySheetActions.Provider value={{ cancel, complete }}>{children}</EntrySheetActions.Provider>
  );
}
/** Fields keep their original form owner; RHF retains values when the panel closes. */
export function EntrySheet({
  title,
  description = "Changes use the existing save action in this panel.",
  trigger,
  children,
  open: controlledOpen,
  onOpenChange,
  draftKeys,
  size = "wide",
  triggerVariant = "outline",
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  draftKeys?: string[];
  size?: "standard" | "wide";
  triggerVariant?: "default" | "outline";
  title: string;
  description?: string;
  trigger?: ReactNode;
  children: ReactNode;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  function setOpen(next: boolean) {
    setLocalOpen(next);
    onOpenChange?.(next);
  }
  const { guard } = useSafety();
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) setOpen(true);
        else void guard(() => setOpen(false), false, draftKeys);
      }}
    >
      <SheetTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          className="w-fit max-w-full justify-self-start"
        >
          {trigger ?? title}
        </Button>
      </SheetTrigger>
      <SheetContent
        className={`w-full gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[state=closed]:hidden ${size === "wide" ? "data-[side=right]:sm:max-w-[680px]" : "data-[side=right]:sm:max-w-[520px]"}`}
      >
        <SheetHeader className="sticky top-0 z-10 border-b border-border bg-card p-6 pr-16">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <EntrySheetActions.Provider
          value={{
            cancel: () => {
              void guard(() => setOpen(false), false, draftKeys);
            },
            complete: () => setOpen(false),
          }}
        >
          <div className="@container min-w-0 flex-1 p-5 sm:p-7">{children}</div>
        </EntrySheetActions.Provider>
      </SheetContent>
    </Sheet>
  );
}
