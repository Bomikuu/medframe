"use client";

import type { ReactNode } from "react";
import { FileWarning, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecoveryState } from "./recovery-state";

export function RecordUnavailable({
  description,
  title = "This information is unavailable",
  retry,
  compact = true,
  children,
}: {
  description: string;
  title?: string;
  retry?: () => void;
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <RecoveryState compact={compact} title={title} description={description} icon={FileWarning}>
      {(children || retry) && (
        <>
          {children}
          {retry && (
            <Button type="button" onClick={retry}>
              <RotateCcw aria-hidden="true" />
              Try again
            </Button>
          )}
        </>
      )}
    </RecoveryState>
  );
}
