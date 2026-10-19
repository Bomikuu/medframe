"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AuthFlow } from "@/features/auth/auth-flow";
import { ApiError, errorMessage, requestWithCsrf } from "@/lib/auth/client";
import { LoadingInformation } from "@/components/application/loading-information";
import { Button } from "@/components/ui/button";
import { PatientAccessPanel, type VerifiedPatient } from "./patient-access-panel";
import { kioskRequest } from "./types";
import type { ReceptionKiosk } from "./reception-assignment";

type StaffContext = {
  organization_id: string;
  branch_id: string;
  staff: string;
  timezone: string;
  kiosks: ReceptionKiosk[];
};

export function AssistedKiosk({ onExit }: { onExit: () => void }) {
  const [context, setContext] = useState<StaffContext | null>(null);
  const [signIn, setSignIn] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [sent, setSent] = useState(false);
  const [selection, setSelection] = useState<VerifiedPatient>({ patient: "", verified: false });
  const lastActivity = useRef(0);
  const exiting = useRef(false);
  const exit = useCallback(async () => {
    if (exiting.current) return;
    exiting.current = true;
    setLocked(true);
    setBusy(true);
    setError("");
    try {
      // Keep device pairing and the patient's pending handoff; remove staff authority.
      await requestWithCsrf("auth/logout", {}, { signal: AbortSignal.timeout(20000) });
      onExit();
    } catch {
      setError(
        "Staff sign-out could not be confirmed. Search is locked. Reconnect and try returning to patient mode again.",
      );
    } finally {
      exiting.current = false;
      setBusy(false);
    }
  }, [onExit]);
  useEffect(() => {
    let active = true;
    void kioskRequest<StaffContext>({ action: "staff_context" })
      .then((value) => {
        if (active) {
          setContext(value);
          setSignIn(false);
          lastActivity.current = Date.now();
        }
      })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) setSignIn(true);
        else setError(errorMessage(cause));
      });
    return () => {
      active = false;
    };
  }, [generation]);
  useEffect(() => {
    const activity = () => {
      lastActivity.current = Date.now();
    };
    window.addEventListener("pointerdown", activity);
    window.addEventListener("keydown", activity);
    const timer = window.setInterval(() => {
      if (context && !locked && Date.now() - lastActivity.current >= 120000) void exit();
    }, 1000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
    };
  }, [context, locked, exit]);
  async function run(body: Record<string, unknown>) {
    if (!context || locked || busy) return undefined;
    setBusy(true);
    setError("");
    try {
      const value = await requestWithCsrf(
        "stations/kiosk/manage",
        {
          organization_id: context.organization_id,
          branch_id: context.branch_id,
          ...body,
        },
        { signal: AbortSignal.timeout(20000) },
      );
      if (body.action === "assign") setSent(true);
      return value;
    } catch (cause) {
      if (cause instanceof ApiError && [401, 403].includes(cause.status)) setLocked(true);
      setError(errorMessage(cause));
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto grid max-w-3xl gap-6" aria-label="Staff-assisted kiosk">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-semibold">Staff-assisted kiosk</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {context && !locked
              ? `Signed in as ${context.staff}. `
              : "Staff sign-in and verification are required. "}
            Search this branch’s patients by name, reference, phone or email. Verify identity before
            opening a patient session.
          </p>
        </div>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void exit()}>
          Return to patient mode
        </Button>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-border bg-muted p-4 text-sm leading-6">
          {error}
        </p>
      )}
      {locked ? (
        <p role="status" className="text-sm leading-6">
          Staff search is locked. Return to patient mode to finish signing out.
        </p>
      ) : context ? (
        <>
          <PatientAccessPanel
            kiosks={context.kiosks}
            timezone={context.timezone}
            busy={busy}
            run={run}
            selection={selection}
            onSelectionChange={setSelection}
          />
          {sent && (
            <div className="grid gap-3 rounded-lg bg-teal-soft p-5 text-teal-ink" role="status">
              <p className="text-sm leading-6">
                Patient sent. Return to patient mode before handing this screen to the patient.
                Staff access will be signed out.
              </p>
              <Button disabled={busy} onClick={() => void exit()} className="justify-self-start">
                Sign out staff and continue
              </Button>
            </div>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            Staff mode signs out after two minutes without interaction. Customer mode never exposes
            the patient directory or clinical records.
          </p>
        </>
      ) : signIn ? (
        <div className="max-w-md rounded-xl border border-border bg-card p-6">
          <AuthFlow
            onAuthenticated={() => {
              setSignIn(false);
              setGeneration((value) => value + 1);
            }}
          />
        </div>
      ) : !error ? (
        <LoadingInformation
          title="Checking staff access"
          detail="Checking your staff sign-in, verification and permissions for this kiosk’s clinic branch."
        />
      ) : (
        <Button
          variant="outline"
          onClick={() => {
            setError("");
            setGeneration((value) => value + 1);
          }}
        >
          Check access again
        </Button>
      )}
    </section>
  );
}
