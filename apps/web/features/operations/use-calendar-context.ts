"use client";

import { useSearchParams } from "next/navigation";
import { useUrlState } from "@/features/workspace/use-url-state";

/** Calendar dates and permitted provider IDs only; patient selections stay in memory. */
export function useCalendarContext(today: string, providers: { id: string }[]) {
  const params = useSearchParams();
  const candidate = params.get("calendarDate");
  const date =
    candidate &&
    /^\d{4}-\d{2}-\d{2}$/.test(candidate) &&
    !Number.isNaN(Date.parse(`${candidate}T12:00:00Z`)) &&
    new Date(`${candidate}T12:00:00Z`).toISOString().slice(0, 10) === candidate
      ? candidate
      : today;
  function setDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const url = new URL(window.location.href);
    url.searchParams.set("calendarDate", value);
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
  }
  const [view, setView] = useUrlState("calendarView", "month", [
    "month",
    "week",
    "day",
    "agenda",
  ] as const);
  const [status, setStatus] = useUrlState("appointmentStatus", "all", [
    "all",
    "booked",
    "checked_in",
    "in_service",
    "completed",
    "cancelled",
    "no_show",
  ] as const);
  const [provider, setProvider] = useUrlState("appointmentProvider", "all", [
    "all",
    ...providers.map((row) => row.id),
  ]);
  return { date, setDate, view, setView, status, setStatus, provider, setProvider };
}
