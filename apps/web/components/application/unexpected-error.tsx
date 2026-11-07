"use client";

import { AlertCircle, House, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecoveryState } from "./recovery-state";

export function UnexpectedError({ retry }: { retry: () => void }) {
  return (
    <main id="main" className="grid min-h-svh place-items-center px-5 py-8">
      <RecoveryState
        level={1}
        icon={AlertCircle}
        title="Something interrupted this page"
        description="We couldn’t finish opening this page. Try again, or open your home page. If this keeps happening, contact your clinic administrator."
      >
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={retry}>
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
          <Button asChild variant="outline">
            <a href="/">
              <House aria-hidden="true" />
              Open home
            </a>
          </Button>
        </div>
      </RecoveryState>
    </main>
  );
}
