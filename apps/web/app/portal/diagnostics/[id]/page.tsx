import { Suspense } from "react";
import { PortalProvider } from "@/features/portal/portal-provider";
import { PatientDiagnostics } from "@/features/diagnostics/patient-diagnostics";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <PortalProvider>
        <PatientDiagnostics id={id} />
      </PortalProvider>
    </Suspense>
  );
}
