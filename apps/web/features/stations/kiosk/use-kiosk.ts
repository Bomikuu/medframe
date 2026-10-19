"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, errorMessage } from "@/lib/auth/client";
import {
  kioskRequest,
  type Setup,
  type PatientSession,
  type Snapshot,
  type Task,
  type Result,
} from "./types";

type View = "home" | "waiting" | "verify" | "register" | "choose" | "review" | "done";
export function useKiosk() {
  const [cycle, setCycle] = useState(0);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [session, setSession] = useState<PatientSession | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [task, setTask] = useState<Task>("booking");
  const [view, setView] = useState<View>("home");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [remaining, setRemaining] = useState(120);
  const epoch = useRef(0);
  const lastActivity = useRef(0);
  const lastPing = useRef(0);
  const mounted = useRef(true);
  const active = useRef<PatientSession | null>(null);
  const reset = useCallback(async (message = "") => {
    epoch.current++;
    setCycle((value) => value + 1);
    active.current = null;
    setSession(null);
    setSnapshot(null);
    setResult(null);
    setView("home");
    setError(message);
    setBusy(true);
    lastActivity.current = Date.now();
    try {
      await kioskRequest({ action: "end" });
      if (mounted.current) setSetup(await kioskRequest<Setup>({ action: "setup" }));
    } catch (cause) {
      if (mounted.current) {
        setSetup(null);
        setError(errorMessage(cause));
      }
    } finally {
      if (mounted.current) setBusy(false);
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
          if (cause instanceof ApiError && cause.status === 403) void reset(errorMessage(cause));
          else setError(errorMessage(cause));
        }
        return undefined;
      } finally {
        if (current === epoch.current && mounted.current) setBusy(false);
      }
    },
    [reset],
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
      lastActivity.current = Date.now();
      setView("choose");
    }
  }
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
      .catch(() => {
        if (current === epoch.current)
          void reset("Your kiosk session ended. Ask reception to continue.");
      });
  }, [reset]);
  const hasSession = !!session;
  useEffect(() => {
    if (view === "home" && !hasSession) return;
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
  }, [view, hasSession, reset]);
  useEffect(() => {
    if (!hasSession) return;
    let cancelled = false;
    const current = epoch.current;
    const refresh = () =>
      void kioskRequest<Snapshot>({ action: "status" })
        .then((value) => {
          if (!cancelled && current === epoch.current) setSnapshot(value);
        })
        .catch((cause) => {
          if (!cancelled && current === epoch.current) void reset(errorMessage(cause));
        });
    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hasSession, reset]); // Polling never renews the patient's inactivity deadline.
  useEffect(() => {
    if (!setup || setup.strict_verification || hasSession || !["home", "waiting"].includes(view))
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
          if (cause instanceof ApiError && cause.status === 403) void reset(errorMessage(cause));
          else setError(errorMessage(cause));
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
  }, [setup, hasSession, view, reset]);
  function home() {
    if (!active.current || setup?.strict_verification) return reset();
    setView("home");
    setResult(null);
    setError("");
  }
  function start(next: Task) {
    setTask(next);
    if (setup?.strict_verification) {
      epoch.current++;
      active.current = null;
      setSession(null);
      setSnapshot(null);
      setView("verify");
    } else setView(active.current ? "choose" : "waiting");
    setResult(null);
    setError("");
    lastActivity.current = Date.now();
    setRemaining(120);
  }
  function complete(value: Result) {
    setResult(value);
    setView("done");
  }
  return {
    cycle,
    setup,
    session,
    snapshot,
    task,
    view,
    setView,
    busy,
    error,
    remaining,
    reset,
    home,
    run,
    verify,
    activity,
    start,
    result,
    complete,
  };
}
