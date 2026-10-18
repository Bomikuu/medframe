import { Suspense } from "react";
import { PortalProvider } from "@/features/portal/portal-provider";
import { PortalReports } from "@/features/portal/portal-reports";
export default function Page() {
  return (
    <Suspense>
      <PortalProvider>
        <PortalReports />
      </PortalProvider>
    </Suspense>
  );
}
