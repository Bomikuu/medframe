import { Suspense } from "react";
import { PortalProvider } from "@/features/portal/portal-provider";
import { PortalRecord } from "@/features/portal/portal-dashboard";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <PortalProvider>
        <PortalRecord releaseId={id} />
      </PortalProvider>
    </Suspense>
  );
}
