import { AuthLayout } from "@/features/auth/auth-layout";
import { RecoveryRequestForm } from "@/features/auth/recovery-form";

export default function RecoverPage() {
  return (
    <AuthLayout>
      <RecoveryRequestForm />
    </AuthLayout>
  );
}
