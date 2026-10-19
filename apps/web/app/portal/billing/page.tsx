import { Suspense } from "react";
import { PortalProvider } from "@/features/portal/portal-provider";
import { PortalBilling } from "@/features/billing/portal-billing";

export default function Page() {
  return (
    <Suspense>
      <PortalProvider>
        <PortalBilling />
      </PortalProvider>
    </Suspense>
  );
}
