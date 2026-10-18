import { PasswordResetForm } from "@/features/auth/recovery-form";
import { PortalAuthLayout } from "@/features/portal/auth/portal-auth-layout";
export default function Page() {
  return (
    <PortalAuthLayout>
      <PasswordResetForm portal />
    </PortalAuthLayout>
  );
}
