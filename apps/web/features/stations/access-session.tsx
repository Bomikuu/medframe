"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { LockKeyhole, RotateCcw } from "lucide-react";
import { RecoveryState } from "@/components/application/recovery-state";
import { WorkspaceLoading } from "@/components/application/workspace-loading";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { errorMessage } from "@/lib/auth/client";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { EndSessionControl } from "./end-session-control";
import { stationRequest, type StationContext, type AccessSession } from "./client";

const StationDetailsContext = createContext<StationContext | null>(null);
export const useStationDetails = () => useContext(StationDetailsContext);
const AccessContext = createContext<AccessSession | null | undefined>(undefined);
export const useStationAccess = () => useContext(AccessContext) ?? null;
export const useInStation = () => useContext(AccessContext) !== undefined;

export function StationSessionBoundary({ children }: { children: ReactNode }) {
  const { organizationId } = useWorkspace();
  const [context, setContext] = useState<StationContext | null>(null);
  const [error, setError] = useState("");
  const [ended, setEnded] = useState(false);
  const knownScope = useRef(false);
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = strip.current;
    if (!element) return;
    const update = () =>
      document.documentElement.style.setProperty(
        "--station-session-offset",
        `${element.getBoundingClientRect().height}px`,
      );
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--station-session-offset");
    };
  }, [context?.access, ended]);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const result = await stationRequest<StationContext>("context", {
          organization_id: organizationId,
        });
        if (!active) return;
        if (knownScope.current && !result.access) setEnded(true);
        knownScope.current ||= !!result.access;
        setContext(result);
        setError("");
      } catch (cause) {
        if (active) setError(errorMessage(cause));
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [organizationId]);
  if (!context && !error)
    return (
      <WorkspaceLoading
        title="Checking Station access"
        detail="Verifying this device and your current clinical session."
      />
    );
  if (ended || context?.error || error)
    return (
      <main id="main" className="grid min-h-svh place-items-center px-5 py-8">
        <RecoveryState
          level={1}
          icon={LockKeyhole}
          title="Station access is paused"
          description={`${error || context?.error || "This short session has ended. Ask the clinician for a new code to continue."} Saved records are preserved. Unsaved clinician input stays in this browser’s memory while this page remains open.`}
        >
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={() => window.location.reload()}>
              <RotateCcw aria-hidden="true" />
              Check connection again
            </Button>
            <ButtonLink href="/station" variant="outline">
              <LockKeyhole aria-hidden="true" />
              Open Station
            </ButtonLink>
          </div>
        </RecoveryState>
      </main>
    );
  return (
    <StationDetailsContext.Provider value={context}>
      <AccessContext.Provider value={context?.access || null}>
        {context?.access && (
          <div
            ref={strip}
            className="sticky top-0 z-[130] flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2 text-xs"
            role="status"
          >
            <p>
              <strong>{context.access.clinician}</strong> ·{" "}
              {context.access.kind === "doctor"
                ? "Clinical workspace"
                : "Assigned consultation only"}{" "}
              · Ends{" "}
              {new Date(context.access.expires_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <EndSessionControl />
          </div>
        )}
        {children}
      </AccessContext.Provider>
    </StationDetailsContext.Provider>
  );
}
