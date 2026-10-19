"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";

const ClinicalTimezone = createContext("Asia/Manila");
export function ClinicalLocaleProvider({
  timezone,
  children,
}: {
  timezone: string;
  children: ReactNode;
}) {
  return <ClinicalTimezone.Provider value={timezone}>{children}</ClinicalTimezone.Provider>;
}
export function useClinicTime() {
  const timezone = useContext(ClinicalTimezone);
  return useCallback(
    (value: string) =>
      new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: timezone,
      }).format(new Date(value)),
    [timezone],
  );
}
