"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, errorMessage } from "@/lib/auth/client";
import type { CompletedTerminalAction } from "./terminal-completed-actions";
import {
  kioskRequest,
  type Setup,
  type PatientSession,
  type Snapshot,
  type Task,
  type Result,
} from "./types";

type View = "home" | "waiting" | "verify" | "register" | "choose" | "review" | "done" | "staff";
export function useKiosk() {
  const [cycle, setCycle] = useState(0);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [session, setSession] = useState<PatientSession | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [task, setTask] = useState<Task>("booking");
  const [view, setView] = useState<View>("home");
  const [staffMode, setStaffMode] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [completed, setCompleted] = useState<CompletedTerminalAction[]>([]);
  const [remaining, setRemaining] = useState(120);
  const epoch = useRef(0);
  const lastActivity = useRef(0);
  const lastPing = useRef(0);
  const mounted = useRef(true);
  const active = useRef<PatientSession | null>(null);
  const resetting = useRef(false);
  const staffModeRef = useRef(false);
  const halt = useCallback((message: string) => {
    epoch.current++;
    active.current = null;
    setCycle((value) => value + 1);
    setSession(null);
    setSnapshot(null);
    setResult(null);
    setCompleted([]);
    setSetup(null);
    setView(staffModeRef.current ? "staff" : "home");
    setError(message);
    setConnectionError("");
    setBusy(false);
  }, []);
  const reset = useCallback(async (message = "") => {
    if (resetting.current) return;
    resetting.current = true;
    const current = ++epoch.current;
    setCycle((value) => value + 1);
    active.current = null;
    setSession(null);
    setSnapshot(null);
    setResult(null);
    setCompleted([]);
    // Pause reception polling until the cleared device boundary has been reloaded.
    setSetup(null);
    setView(staffModeRef.current ? "staff" : "home");
    setError(message);
    setConnectionError("");
    setBusy(true);
    lastActivity.current = Date.now();
    try {
      await kioskRequest({ action: "end" });
      const value = await kioskRequest<Setup>({ action: "setup" });
      if (mounted.current && current === epoch.current) setSetup(value);
    } catch (cause) {
      if (mounted.current && current === epoch.current) {
        setSetup(null);
        setError(errorMessage(cause));
      }
    } finally {
      resetting.current = false;
      if (mounted.current && current === epoch.current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const initial = window.setTimeout(() => void reset(), 0);
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void reset();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.clearTimeout(initial);
      mounted.current = false;
      epoch.current++;
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [reset]);
  const run = useCallback(
    async <T>(body: unknown): Promise<T | undefined> => {
      const current = epoch.current;
      setBusy(true);
      setError("");
      try {
        const value = await kioskRequest<T>(body);
        return current === epoch.current && mounted.current ? value : undefined;
      } catch (cause) {
        if (current === epoch.current && mounted.current) {
          if (
            cause instanceof ApiError &&
            ["PATIENT_SESSION_ENDED", "DEVICE_UNAVAILABLE"].includes(cause.code)
          )
            halt(errorMessage(cause));
          else setError(errorMessage(cause));
        }
        return undefined;
      } finally {
        if (current === epoch.current && mounted.current) setBusy(false);
      }
    },
    [halt],
  );
  async function verify(code: string) {
    const value = await run<PatientSession>({
      action: "verify",
      code,
      generation: setup?.generation,
    });
    if (value) {
      active.current = value;
      setSession(value);
      setCompleted([]);
      lastActivity.current = Date.now();
      setView("choose");
    }
  }
  function acceptSession(value: PatientSession) {
    active.current = value;
    setSession(value);
    setSnapshot(null);
    setResult(null);
    setCompleted([]);
    setError("");
    lastActivity.current = Date.now();
    lastPing.current = 0;
    setView("home");
  }
  async function identify(identifier: string) {
    const value = await run<PatientSession>({
      action: "identify",
      identifier,
      generation: setup?.generation,
    });
    if (value) acceptSession(value);
  }
  function enterStaff() {
    staffModeRef.current = true;
    setStaffMode(true);
    setView("staff");
  }
  const leaveStaff = useCallback(() => {
    staffModeRef.current = false;
    setStaffMode(false);
    void reset();
  }, [reset]);
  const activity = useCallback(() => {
    lastActivity.current = Date.now();
    if (!active.current || Date.now() - lastPing.current < 20000) return;
    lastPing.current = Date.now();
    const current = epoch.current;
    void kioskRequest<PatientSession>({ action: "activity" })
      .then((value) => {
        if (current === epoch.current && mounted.current) {
          active.current = value;
          setSession(value);
        }
      })
      .catch((cause) => {
        if (current === epoch.current) {
          if (cause instanceof ApiError && cause.status === 403) halt(errorMessage(cause));
          else
            setConnectionError(
              "Connection interrupted. Your selections are still here. Reconnecting…",
            );
        }
      });
  }, [halt]);
  const hasSession = !!session;
  useEffect(() => {
    if (staffMode || view === "staff" || (view === "home" && !hasSession)) return;
    const timer = window.setInterval(() => {
      const absolute = active.current ? new Date(active.current.expires_at).getTime() : Infinity;
      const idle = active.current
        ? new Date(active.current.idle_expires_at).getTime()
        : lastActivity.current + 120000;
      const seconds = Math.ceil((Math.min(idle, absolute) - Date.now()) / 1000);
      setRemaining(seconds);
      if (seconds <= 0) void reset("Session cleared for your privacy.");
    }, 1000);
    return () => window.clearInterval(timer);
  }, [view, hasSession, reset, staffMode]);
  useEffect(() => {
    if (!hasSession) return;
    let cancelled = false;
    const current = epoch.current;
    const refresh = () =>
      void kioskRequest<Snapshot>({ action: "status" })
        .then((value) => {
          if (!cancelled && current === epoch.current) {
            setSnapshot(value);
            setConnectionError("");
          }
        })
        .catch((cause) => {
          if (!cancelled && current === epoch.current) {
            if (cause instanceof ApiError && cause.status === 403) halt(errorMessage(cause));
            else
              setConnectionError(
                "Connection interrupted. Your selections are still here. Reconnecting…",
              );
          }
        });
    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hasSession, halt]); // Polling never renews the patient's inactivity deadline.
  useEffect(() => {
    if (
      !setup ||
      staffMode ||
      setup.strict_verification ||
      hasSession ||
      !["home", "waiting"].includes(view)
    )
      return;
    let cancelled = false;
    let pending = false;
    const current = epoch.current;
    const receive = async () => {
      if (pending) return;
      pending = true;
      try {
        const value = await kioskRequest<{ session: PatientSession | null }>({
          action: "receive",
          generation: setup.generation,
        });
        if (!cancelled && current === epoch.current && value.session) {
          active.current = value.session;
          setSession(value.session);
          setRemaining(120);
          lastActivity.current = Date.now();
          setView((previous) => (previous === "waiting" ? "choose" : previous));
        }
      } catch (cause) {
        if (!cancelled && current === epoch.current) {
          if (cause instanceof ApiError && cause.status === 403) halt(errorMessage(cause));
          else
            setConnectionError(
              "Waiting for a connection to reception. Your details have been kept.",
            );
        }
      } finally {
        pending = false;
      }
    };
    const initial = window.setTimeout(() => void receive(), 0);
    const timer = window.setInterval(() => void receive(), 4000);
    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [setup, hasSession, view, halt, staffMode]);
  function home() {
    if (!active.current || (setup?.strict_verification && !staffMode)) return reset();
    setView("home");
    setResult(null);
    setError("");
  }
  function start(next: Task) {
    setTask(next);
    if (setup?.strict_verification && !staffMode) {
      epoch.current++;
      active.current = null;
      setSession(null);
      setSnapshot(null);
      setCompleted([]);
      setView("verify");
    } else setView(active.current ? "choose" : "home");
    setResult(null);
    setError("");
    lastActivity.current = Date.now();
    setRemaining(120);
  }
  function complete(value: Result) {
    setResult(value);
    if (value.kind !== "intake") {
      const identity = value.ticket?.id ?? value.appointment?.id;
      setCompleted((previous) =>
        identity &&
        previous.some(({ result }) => (result.ticket?.id ?? result.appointment?.id) === identity)
          ? previous
          : [...previous, { task, result: value }],
      );
    }
    setView(value.kind === "intake" ? "waiting" : "done");
  }
  return {
    cycle,
    staffMode,
    enterStaff,
    leaveStaff,
    acceptSession,
    identify,
    setup,
    session,
    snapshot,
    task,
    view,
    setView,
    busy,
    error,
    connectionError,
    remaining,
    reset,
    home,
    run,
    verify,
    activity,
    start,
    result,
    completed,
    complete,
  };
}
