"use client";

import type { ReactNode } from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// One mounted, nonmodal dock preserves drafts and in-flight uploads when hidden.
// On narrow screens it overlays the stage; the call controls remain available.
export function ConversationDock({
  open,
  close,
  children,
}: {
  open: boolean;
  close: () => void;
  children: ReactNode;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
      modal={false}
    >
      <SheetPrimitive.Content
        forceMount
        id="call-conversation-panel"
        aria-describedby={undefined}
        onInteractOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={cn(
          "absolute inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-border bg-card shadow-lg outline-none lg:relative lg:z-auto lg:w-[340px] lg:shrink-0 lg:shadow-none",
          !open && "hidden",
        )}
      >
        <SheetPrimitive.Title className="sr-only">Chat and shared files</SheetPrimitive.Title>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 size-11"
          aria-label="Close conversation"
          onClick={close}
        >
          <X aria-hidden className="size-4" />
        </Button>
        {children}
      </SheetPrimitive.Content>
    </Sheet>
  );
}
