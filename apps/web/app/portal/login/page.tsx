import { AuthFlow } from "@/features/auth/auth-flow";
import { PortalAuthLayout } from "@/features/portal/auth/portal-auth-layout";
export default function Page() {
  return (
    <PortalAuthLayout>
      <AuthFlow portal />
    </PortalAuthLayout>
  );
}
