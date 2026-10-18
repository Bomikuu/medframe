import { AuthLayout } from "@/features/auth/auth-layout";
import { PasswordResetForm } from "@/features/auth/recovery-form";

export default function ResetPage() {
  return (
    <AuthLayout>
      <PasswordResetForm />
    </AuthLayout>
  );
}
