import { RecoveryRequestForm } from "@/features/auth/recovery-form";
import { PortalAuthLayout } from "@/features/portal/auth/portal-auth-layout";
import { localMailPreviewUrl } from "@/lib/server/local-mail-preview";
export default function Page() {
  return (
    <PortalAuthLayout>
      <RecoveryRequestForm portal localInboxUrl={localMailPreviewUrl()} />
    </PortalAuthLayout>
  );
}
