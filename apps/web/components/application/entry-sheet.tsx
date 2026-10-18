"use client";
import { useState, type ReactNode } from "react";
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
/** Fields keep their original form owner; RHF retains values when the panel closes. */
export function EntrySheet({
  title,
  description = "Changes use the existing save action in this panel.",
  trigger,
  children,
  open: controlledOpen,
  onOpenChange,
  draftKeys,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  draftKeys?: string[];
  title: string;
  description?: string;
  trigger?: string;
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
        <Button type="button" variant="outline">
          {trigger ?? title}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto p-0 data-[state=closed]:hidden sm:max-w-xl">
        <SheetHeader className="sticky top-0 z-10 border-b border-border bg-card p-6 pr-12">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="p-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
