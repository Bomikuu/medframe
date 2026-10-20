"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, errorMessage, requestWithCsrf } from "@/lib/auth/client";
import { displaySchema, type DisplaySnapshot } from "./schema";

export function useDisplay() {
  const [data, setData] = useState<DisplaySnapshot | null>(null);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [contact, setContact] = useState(0);
  const [now, setNow] = useState(0);
  const [retry, setRetry] = useState(0);
  const latest = useRef<DisplaySnapshot | null>(null);
  const connection = useRef(true);
  const lastContact = useRef(0);
  const [newCalls, setNewCalls] = useState<DisplaySnapshot["called"]>([]);
  useEffect(() => {
    let active = true;
    let timer: number;
    let controller: AbortController | null = null;
    async function poll() {
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 20000);
      try {
        const result = displaySchema.parse(
          await requestWithCsrf("stations/display", {}, { signal: controller.signal }),
        );
        if (!active) return;
        const previous = latest.current;
        const sameDay = previous?.day === result.day;
        setNewCalls(
          previous && sameDay && connection.current && Date.now() - lastContact.current < 15000
            ? result.called.filter(
                (entry) =>
                  entry.call_token &&
                  !previous.called.some((old) => old.call_token === entry.call_token),
              )
            : [],
        );
        latest.current = result;
        connection.current = true;
        setData(result);
        lastContact.current = Date.now();
        setContact(lastContact.current);
        setNow(Date.now());
        setError("");
        setDenied(false);
      } catch (cause) {
        if (!active) return;
        connection.current = false;
        setNewCalls([]);
        setError(errorMessage(cause));
        if (cause instanceof ApiError && [401, 403, 404].includes(cause.status)) {
          latest.current = null;
          setData(null);
          setDenied(true);
          return;
        }
      } finally {
        window.clearTimeout(timeout);
        if (active) timer = window.setTimeout(() => void poll(), 5000);
      }
    }
    void poll();
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      controller?.abort();
      window.clearTimeout(timer);
      window.clearInterval(clock);
    };
  }, [retry]);
  const expired = !!contact && now - contact >= 30000;
  const oldDay =
    data &&
    new Intl.DateTimeFormat("en-CA", {
      timeZone: data.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(now)) !== data.day;
  return {
    data: expired || oldDay || denied ? null : data,
    error,
    denied,
    contact,
    now,
    newCalls: expired || oldDay || denied ? [] : newCalls,
    stale: !!error || (!!contact && now - contact >= 15000),
    reload: () => setRetry((value) => value + 1),
  };
}
