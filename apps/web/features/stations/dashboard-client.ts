"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, errorMessage } from "@/lib/auth/client";
import { stationRequest } from "./client";

export type GalleryItem = {
  id: string;
  patient_id: string;
  patient: string;
  reference: string;
  portrait_id: string | null;
  encounter_id: string | null;
  appointment_id: string | null;
  ticket_id: string | null;
  queue_number: number | null;
  queue_day: string | null;
  resource: string | null;
  time: string;
  time_kind: "scheduled" | "opened" | "checked_in";
  reason: string;
  status: string;
  clinical_status: string | null;
  timing: { kind: string; minutes: number; delay: number };
  rescheduled_at: string | null;
  rescheduled_from: string | null;
};
export type Dashboard = {
  items: GalleryItem[];
  agenda: GalleryItem[];
  date: string;
  timezone: string;
  branch: string;
  updated_at: string;
  has_more: boolean;
  cursor: string | null;
  agenda_truncated: boolean;
  operations_available: boolean;
};
export function useStationDashboard(
  organizationId: string,
  branchId: string,
  view: string,
  before: string | null,
) {
  const key = JSON.stringify({ organizationId, branchId, view, before });
  const [state, setState] = useState<{ key: string; data: Dashboard | null; error: string }>({
    key: "",
    data: null,
    error: "",
  });
  const [loading, setLoading] = useState(false);
  const [generation, setGeneration] = useState(0);
  const reload = useCallback(() => setGeneration((value) => value + 1), []);
  useEffect(() => {
    if (!branchId) return;
    let active = true;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      setLoading(true);
      try {
        const result = await stationRequest<Dashboard>("dashboard", {
          organization_id: organizationId,
          branch_id: branchId,
          view,
          before,
        });
        if (active) setState({ key, data: result, error: "" });
      } catch (cause) {
        if (active)
          setState((previous) => ({
            key,
            data:
              cause instanceof ApiError && [401, 403, 404].includes(cause.status)
                ? null
                : previous.key === key
                  ? previous.data
                  : null,
            error: errorMessage(cause),
          }));
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    };
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => {
      active = false;
      window.clearTimeout(initial);
      window.clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [organizationId, branchId, view, before, key, generation]);
  return {
    data: state.key === key ? state.data : null,
    error: state.key === key ? state.error : "",
    loading,
    reload,
  };
}
export function clinicTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
export function clinicDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
