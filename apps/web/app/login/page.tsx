import { redirect } from "next/navigation";
import { readBrowserSession } from "@/lib/server/session-route";
import { LoginSessionBoundary, SessionUnavailable } from "@/features/auth/session-recovery";
import { AuthFlow } from "@/features/auth/auth-flow";
import { AuthLayout } from "@/features/auth/auth-layout";

export default async function LoginPage() {
  const session = await readBrowserSession();
  if (!session) return <SessionUnavailable />;
  if (session.authenticated) redirect(session.destination);
  return (
    <AuthLayout>
      <LoginSessionBoundary>
        <AuthFlow />
      </LoginSessionBoundary>
    </AuthLayout>
  );
}
