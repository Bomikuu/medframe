import { AuthFlow } from "@/features/auth/auth-flow";
import { AuthLayout } from "@/features/auth/auth-layout";

export default function LoginPage() {
  return (
    <AuthLayout>
      <AuthFlow />
    </AuthLayout>
  );
}
