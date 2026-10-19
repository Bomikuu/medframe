"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { errorMessage } from "@/lib/auth/client";
import { EndSessionControl } from "./end-session-control";
import { stationRequest, type StationContext, type AccessSession } from "./client";

const AccessContext = createContext<AccessSession | null | undefined>(undefined);
export const useStationAccess = () => useContext(AccessContext) ?? null;
export const useInStation = () => useContext(AccessContext) !== undefined;

export function StationSessionBoundary({ children }: { children: ReactNode }) {
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
        const result = await stationRequest<StationContext>("context");
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
  }, []);
  if (!context && !error)
    return (
      <p role="status" className="p-5 text-sm">
        Checking Station access…
      </p>
    );
  if (ended || context?.error || error)
    return (
      <main id="main" className="mx-auto grid max-w-lg gap-5 p-8 pt-16">
        <LockKeyhole className="size-8 text-primary" />
        <h1 className="text-2xl font-semibold">Station access paused</h1>
        <p role="status" className="text-sm leading-6 text-muted-foreground">
          {error ||
            context?.error ||
            "This short session has ended. Ask the clinician for a new code to continue."}{" "}
          Saved records are preserved. Unsaved clinician input stays in this browser’s memory while
          this page remains open.
        </p>
        <Button onClick={() => window.location.reload()}>Check connection again</Button>
        <ButtonLink href="/station" variant="outline">
          Return to Station
        </ButtonLink>
      </main>
    );
  return (
    <AccessContext.Provider value={context?.access || null}>
      {context?.access && (
        <div
          ref={strip}
          className="sticky top-0 z-[130] flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2 text-xs"
          role="status"
        >
          <p>
            <strong>{context.access.clinician}</strong> ·{" "}
            {context.access.kind === "doctor" ? "Clinical workspace" : "Assigned consultation only"}{" "}
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
  );
}
