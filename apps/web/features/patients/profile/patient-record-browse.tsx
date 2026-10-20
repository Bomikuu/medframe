"use client";

import { createContext, useContext, type ReactNode } from "react";

// Presentation only: native server permissions remain authoritative in every workflow.
const PatientRecordBrowseContext = createContext(false);
export const usePatientRecordReadOnly = () => useContext(PatientRecordBrowseContext);
export function PatientRecordBrowse({ children }: { children: ReactNode }) {
  return (
    <PatientRecordBrowseContext.Provider value>{children}</PatientRecordBrowseContext.Provider>
  );
}
