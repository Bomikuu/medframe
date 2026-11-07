"use client";

import { FileQuestion, House } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecoveryState } from "@/components/application/recovery-state";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-svh place-items-center px-5 py-8">
      <RecoveryState
        level={1}
        icon={FileQuestion}
        title="We couldn’t find this page"
        description="This link may be incomplete, or the page may have moved. Check the address or open your home page to continue."
      >
        <Button asChild>
          <a href="/">
            <House aria-hidden="true" />
            Open home
          </a>
        </Button>
      </RecoveryState>
    </main>
  );
}
