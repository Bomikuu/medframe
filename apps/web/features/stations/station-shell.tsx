"use client";

import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button-link";
import { ClinicalLocaleProvider } from "@/components/application/clinical-locale";
import { useWorkspace } from "@/features/workspace/workspace-provider";

export function StationShell({ children }: { children: ReactNode }) {
  const { workspace, href } = useWorkspace();
  return (
    <ClinicalLocaleProvider timezone={workspace.organization.timezone}>
      <div className="min-h-dvh bg-background">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Brand />
            <span className="border-l border-border pl-4 text-sm font-semibold">Station</span>
            <span className="hidden text-sm text-muted-foreground md:inline">
              {workspace.organization.name}
            </span>
          </div>
          <div className="flex gap-2">
            <ButtonLink href={href("/station/clinician")} variant="ghost">
              Station home
            </ButtonLink>
            <ButtonLink href={href("/clinic")} variant="outline">
              Clinic workspace
            </ButtonLink>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-[1920px] p-4 sm:p-6">
          {children}
        </main>
      </div>
    </ClinicalLocaleProvider>
  );
}
