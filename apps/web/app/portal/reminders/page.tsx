import { Suspense } from "react";
import { PortalProvider } from "@/features/portal/portal-provider";
import { PortalReminders } from "@/features/communications/portal-reminders";

export default function Page() {
  return (
    <Suspense>
      <PortalProvider>
        <PortalReminders />
      </PortalProvider>
    </Suspense>
  );
}
