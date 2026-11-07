"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, RotateCcw, Stethoscope, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoadingInformation({
  title,
  detail = "Checking your current access and retrieving information for this workspace.",
  retry,
  icon: Icon = Stethoscope,
}: {
  title: string;
  detail?: string;
  retry?: () => void;
  icon?: LucideIcon;
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    const timer = window.setTimeout(() => setSlow(true), 8000);
    return () => window.clearTimeout(timer);
  }, [title]);
  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col items-center gap-5 text-center"
      aria-busy="true"
    >
      <div
        className="relative flex size-20 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        <div className="absolute inset-2 rounded-full bg-secondary" />
        <LoaderCircle
          className="absolute inset-0 size-20 animate-spin text-[var(--brand-teal)] motion-reduce:animate-none"
          strokeWidth={1.5}
        />
        <Icon className="relative size-7 text-primary" strokeWidth={1.75} />
      </div>
      <div role="status" aria-live="polite" aria-atomic="true">
        <p className="text-lg font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
        {slow && (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This is taking longer than usual. Check your connection or retry. You do not need to
            refresh the whole page.
          </p>
        )}
      </div>
      {slow && retry && (
        <Button type="button" variant="outline" onClick={retry} className="gap-2">
          <RotateCcw className="size-4" aria-hidden="true" />
          Retry loading
        </Button>
      )}
    </div>
  );
}
