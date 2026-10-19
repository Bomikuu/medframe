"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function LoadingInformation({
  title,
  detail = "Checking your current access and retrieving information for this workspace. Your entered details stay on this page.",
  retry,
}: {
  title: string;
  detail?: string;
  retry?: () => void;
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="grid w-full max-w-xl gap-4" aria-busy="true">
      <div role="status" aria-live="polite">
        <p className="text-base font-semibold">{title}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
        {slow && (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This is taking longer than usual. Check your connection or retry. You do not need to
            refresh the whole page.
          </p>
        )}
      </div>
      <div aria-hidden="true" className="grid gap-3 motion-reduce:[&_*]:animate-none">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      {slow && retry && (
        <Button type="button" variant="outline" onClick={retry} className="justify-self-start">
          Retry loading
        </Button>
      )}
    </div>
  );
}
