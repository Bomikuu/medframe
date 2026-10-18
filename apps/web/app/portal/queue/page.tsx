import { Suspense } from "react";
import { PortalProvider } from "@/features/portal/portal-provider";
import { PatientOperations } from "@/features/portal/operations/patient-operations";
export default function Page() {
  return (
    <Suspense>
      <PortalProvider>
        <PatientOperations queue />
      </PortalProvider>
    </Suspense>
  );
}
