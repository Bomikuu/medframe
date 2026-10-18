import { Suspense } from "react";
import { PortalProvider } from "@/features/portal/portal-provider";
import { PortalDashboard } from "@/features/portal/portal-dashboard";
export default function Page() {
  return (
    <Suspense>
      <PortalProvider>
        <PortalDashboard />
      </PortalProvider>
    </Suspense>
  );
}
