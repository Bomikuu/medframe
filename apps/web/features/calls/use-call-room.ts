"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, errorMessage } from "@/lib/auth/client";
import { callRequest, type CallState } from "./client";
import { useRoomUpdates } from "./use-room-updates";

export function useCallRoom(roomId: string) {
  const [state, setState] = useState<CallState | null>(null);
  const [error, setError] = useState("");
  const [ended, setEnded] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const active = useRef(true);
  const pending = useRef<Promise<void> | null>(null);
  const queued = useRef(false);
  const generation = useRef(0);
  const expiryCheck = useRef(0);
  const clock = useRef({ server: 0, received: 0, end: 0 });
  const update = useCallback((value: CallState) => {
    if (!active.current) return;
    setState(value);
    setError("");
    clock.current = {
      server: Date.parse(value.server_now),
      received: Date.now(),
      end: Date.parse(value.end),
    };
    setSeconds(Math.max(0, Math.ceil((clock.current.end - clock.current.server) / 1000)));
  }, []);
  const failed = useCallback((failure: unknown) => {
    if (!active.current) return;
    setError(errorMessage(failure));
    if (failure instanceof ApiError) setCloseReason(failure.code);
    if (
      failure instanceof ApiError &&
      [
        "ROOM_ENDED",
        "ROOM_ACCESS_REQUIRED",
        "FORBIDDEN",
        "UNAUTHENTICATED",
        "WAITING_REMOVED",
      ].includes(failure.code)
    )
      setEnded(true);
  }, []);
  const refresh = useCallback(async () => {
    if (pending.current) {
      queued.current = true;
      return pending.current;
    }
    const epoch = generation.current;
    const task = (async () => {
      do {
        queued.current = false;
        try {
          const value = await callRequest("snapshot", roomId);
          if (epoch !== generation.current) return;
          update(value);
        } catch (failure) {
          if (epoch !== generation.current) return;
          failed(failure);
        }
      } while (queued.current && active.current && epoch === generation.current);
    })();
    pending.current = task;
    try {
      await task;
    } finally {
      if (pending.current === task) pending.current = null;
    }
  }, [roomId, update, failed]);
  useEffect(() => {
    active.current = true;
    generation.current += 1;
    const epoch = generation.current;
    pending.current = null;
    queued.current = false;
    const controller = new AbortController();
    void callRequest("inspect", roomId, {}, controller.signal)
      .then(async (value) => {
        if (!active.current || epoch !== generation.current) return;
        update(value);
        if (value.has_access) await refresh();
      })
      .catch((failure) => {
        if (!controller.signal.aborted && epoch === generation.current) failed(failure);
      });
    return () => {
      active.current = false;
      generation.current += 1;
      controller.abort();
    };
  }, [roomId, update, failed, refresh]);
  const authorized = !!state?.role && !ended;
  useRoomUpdates(roomId, authorized, refresh);
  useEffect(() => {
    if (!state || ended || state.timing_mode === "instant") return;
    const tick = setInterval(() => {
      const remaining = Math.ceil(
        (clock.current.end - clock.current.server - (Date.now() - clock.current.received)) / 1000,
      );
      setSeconds(Math.max(0, remaining));
      // Confirm expiry with Django so a newly extended room is not closed by an old clock.
      if (remaining <= 0 && Date.now() - expiryCheck.current >= 5000) {
        expiryCheck.current = Date.now();
        void refresh();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [!!state, state?.timing_mode, ended, refresh]);
  async function join(doctor: boolean, pin = "") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await callRequest(doctor ? "join_doctor" : "join_patient", roomId, { pin });
      await refresh();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      if (active.current) setBusy(false);
    }
  }
  async function action(action: string, values: Record<string, unknown> = {}) {
    if (busy || !state) return false;
    setBusy(true);
    setError("");
    try {
      await callRequest(action, roomId, { expected_version: state.version, ...values });
      if (action === "end") setEnded(true);
      else await refresh();
      return true;
    } catch (failure) {
      setError(errorMessage(failure));
      void refresh();
      return false;
    } finally {
      if (active.current) setBusy(false);
    }
  }
  return { state, error, ended, closeReason, busy, seconds, join, action, refresh };
}
