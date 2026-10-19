import { Suspense } from "react";
import { PortalProvider } from "@/features/portal/portal-provider";
import { PatientDiagnostics } from "@/features/diagnostics/patient-diagnostics";
export default function Page() {
  return (
    <Suspense>
      <PortalProvider>
        <PatientDiagnostics />
      </PortalProvider>
    </Suspense>
  );
}
