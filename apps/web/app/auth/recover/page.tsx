import { AuthLayout } from "@/features/auth/auth-layout";
import { RecoveryRequestForm } from "@/features/auth/recovery-form";
import { localMailPreviewUrl } from "@/lib/server/local-mail-preview";

export default function RecoverPage() {
  return (
    <AuthLayout>
      <RecoveryRequestForm localInboxUrl={localMailPreviewUrl()} />
    </AuthLayout>
  );
}
