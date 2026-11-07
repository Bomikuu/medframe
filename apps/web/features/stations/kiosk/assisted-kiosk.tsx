"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Users, Clock3, LogOut } from "lucide-react";
import { AuthFlow } from "@/features/auth/auth-flow";
import { ApiError, errorMessage, requestWithCsrf } from "@/lib/auth/client";
import { Brand } from "@/components/brand";
import { LoadingInformation } from "@/components/application/loading-information";
import { Button } from "@/components/ui/button";
import { TerminalPatientSearch, type TerminalPatient } from "./terminal-entry";
import { kioskRequest, type PatientSession } from "./types";

type StaffContext = { organization_id: string; branch_id: string; staff: string; timezone: string };

/** Remains mounted across patient changes so staff inactivity is never reset by child remounts. */
export function AssistedKiosk({
  active,
  session,
  generation: boundaryGeneration,
  terminalBusy,
  onSession,
  onActivity,
  onExit,
  children,
}: {
  active: boolean;
  session: PatientSession | null;
  generation?: number;
  terminalBusy: boolean;
  onSession: (value: PatientSession) => void;
  onActivity: () => void;
  onExit: () => void;
  children: ReactNode;
}) {
  const [context, setContext] = useState<StaffContext | null>(null);
  const [signIn, setSignIn] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [remaining, setRemaining] = useState(120);
  const lastActivity = useRef(0);
  const exiting = useRef(false);
  const enabled = useRef(active);
  enabled.current = active;
  const exit = useCallback(async () => {
    if (exiting.current) return;
    exiting.current = true;
    setLocked(true);
    setBusy(true);
    setError("");
    try {
      await requestWithCsrf("auth/logout", {}, { signal: AbortSignal.timeout(20000) });
      setContext(null);
      onExit();
    } catch {
      setError(
        "Staff sign-out could not be confirmed. Patient access is locked. Reconnect and choose Sign out of staff mode again.",
      );
    } finally {
      exiting.current = false;
      setBusy(false);
    }
  }, [onExit]);
  useEffect(() => {
    if (!active) return;
    let current = true;
    setContext(null);
    setLocked(false);
    setSignIn(false);
    setError("");
    setRemaining(120);
    void kioskRequest<StaffContext>({ action: "staff_context" })
      .then((value) => {
        if (current) {
          setContext(value);
          lastActivity.current = Date.now();
        }
      })
      .catch((cause) => {
        if (!current) return;
        if (cause instanceof ApiError && cause.status === 401) setSignIn(true);
        else setError(errorMessage(cause));
      });
    return () => {
      current = false;
    };
  }, [active, attempt]);
  useEffect(() => {
    if (!active || !context || locked) return;
    const activity = () => {
      lastActivity.current = Date.now();
      setRemaining(120);
    };
    window.addEventListener("pointerdown", activity);
    window.addEventListener("keydown", activity);
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((120000 - (Date.now() - lastActivity.current)) / 1000));
      setRemaining(seconds);
      if (seconds <= 0) void exit();
    }, 1000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
    };
  }, [active, context, locked, exit]);
  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    if (!context || locked || busy) return;
    setBusy(true);
    setError("");
    try {
      return await action();
    } catch (cause) {
      if (cause instanceof ApiError && [401, 403].includes(cause.status)) setLocked(true);
      setError(errorMessage(cause));
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  if (!active) return children;
  return (
    <main id="main" className="min-h-dvh bg-background">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-card px-5 py-4 sm:px-10">
        <Brand />
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg bg-teal-soft px-3 py-2 text-sm font-semibold text-teal-ink">
            <Users className="size-4" aria-hidden />
            Staff terminal
          </span>
          {context && <span className="text-sm text-muted-foreground">{context.staff}</span>}
          <Button variant="outline" disabled={busy || terminalBusy} onClick={() => void exit()}>
            <LogOut aria-hidden />
            Sign out of staff mode
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-10 sm:py-10">
        <p className="mb-6 text-xs leading-5 text-muted-foreground">
          Signing out ends this staff session in other clinic tabs in this browser, clears the
          selected patient and returns to patient mode. This device stays paired.
        </p>
        {context && !locked && remaining <= 30 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary p-4">
            <div>
              <p role="status" className="flex items-center gap-2 text-sm font-semibold">
                <Clock3 className="size-4" aria-hidden />
                Staff mode is about to sign out
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                <span aria-hidden>{remaining} seconds left. </span>
                Continue if you are still assisting this patient.
              </p>
            </div>
            <Button
              variant="outline"
              disabled={busy || terminalBusy}
              onClick={() => {
                lastActivity.current = Date.now();
                setRemaining(120);
                onActivity();
              }}
            >
              Keep staff mode open
            </Button>
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm leading-6 text-destructive"
          >
            {error}
          </p>
        )}
        {locked ? (
          <p role="status" className="rounded-xl border bg-card p-6">
            Staff access is locked. Choose Sign out of staff mode to finish signing out.
          </p>
        ) : context ? (
          <>
            {session || boundaryGeneration === undefined ? (
              children
            ) : (
              <TerminalPatientSearch
                busy={busy || terminalBusy}
                onSearch={async (query) => {
                  const result = await run(() =>
                    requestWithCsrf<{ patients: TerminalPatient[] }>(
                      "stations/kiosk/manage",
                      {
                        action: "patients",
                        organization_id: context.organization_id,
                        branch_id: context.branch_id,
                        query,
                      },
                      { signal: AbortSignal.timeout(20000) },
                    ),
                  );
                  return result?.patients;
                }}
                onSelect={async (patient) => {
                  const result = await run(() =>
                    kioskRequest<PatientSession>({
                      action: "staff_select",
                      patient_id: patient.id,
                      generation: boundaryGeneration,
                    }),
                  );
                  if (result && enabled.current && !exiting.current) onSession(result);
                }}
              />
            )}
            <p className="mt-8 text-xs leading-5 text-muted-foreground">
              Staff access signs out after two minutes without interaction. Patient-facing mode has
              no patient directory.
            </p>
          </>
        ) : signIn ? (
          <div className="mx-auto max-w-md rounded-2xl border bg-card p-6">
            <h1 className="mb-2 text-xl font-semibold">Staff sign-in</h1>
            <p className="mb-6 text-sm leading-6 text-muted-foreground">
              Use your clinic account to search patients and assist with their visit.
            </p>
            <AuthFlow
              onAuthenticated={() => {
                setSignIn(false);
                setAttempt((value) => value + 1);
              }}
            />
          </div>
        ) : !error ? (
          <LoadingInformation
            title="Checking staff access"
            detail="Checking your clinic membership and permissions for this terminal."
          />
        ) : (
          <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
            Check access again
          </Button>
        )}
      </div>
    </main>
  );
}
