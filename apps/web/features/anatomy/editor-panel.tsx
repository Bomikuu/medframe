"use client";
import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export function EditorPanel({
  desktop,
  open,
  onOpenChange,
  title,
  description,
  side = "right",
  className,
  children,
  ownHeader = false,
}: {
  desktop: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  side?: "left" | "right";
  className?: string;
  children: ReactNode;
  ownHeader?: boolean;
}) {
  if (desktop)
    return (
      <aside
        aria-label={title}
        className={`min-h-0 min-w-0 overflow-hidden bg-card ${className ?? ""}`}
      >
        {children}
      </aside>
    );
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className="z-[80] w-[min(94vw,380px)] gap-0 p-0 sm:max-w-[380px]"
        showCloseButton={!ownHeader}
      >
        <SheetHeader className={ownHeader ? "sr-only" : "shrink-0 border-b border-border pr-14"}>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
