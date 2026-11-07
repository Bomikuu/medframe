import { redirect } from "next/navigation";
import { readBrowserSession } from "@/lib/server/session-route";
import { LoginSessionBoundary, SessionUnavailable } from "@/features/auth/session-recovery";
import { AuthFlow } from "@/features/auth/auth-flow";
import { SignInLayout } from "@/features/auth/sign-in-layout";
export default async function Page() {
  const session = await readBrowserSession();
  if (!session) return <SessionUnavailable />;
  if (session.authenticated) redirect(session.destination);
  return (
    <SignInLayout portal>
      <LoginSessionBoundary>
        <AuthFlow portal />
      </LoginSessionBoundary>
    </SignInLayout>
  );
}
