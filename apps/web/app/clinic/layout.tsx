import { Suspense } from "react";
import { SafetyProvider } from "@/features/workspace/safety-provider";
import { WorkspaceProvider } from "@/features/workspace/workspace-provider";
import { ClinicShell } from "@/features/workspace/clinic-shell";
import { readBrowserSession } from "@/lib/server/session-route";
import { SessionUnavailable } from "@/features/auth/session-recovery";
import { redirect } from "next/navigation";

export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const session = await readBrowserSession();
  if (!session) return <SessionUnavailable />;
  if (session.kind !== "staff") redirect(session.destination);
  return (
    <Suspense
      fallback={
        <main id="main" className="p-8" role="status">
          Loading clinic workspace…
        </main>
      }
    >
      <SafetyProvider>
        <WorkspaceProvider>
          <ClinicShell>{children}</ClinicShell>
        </WorkspaceProvider>
      </SafetyProvider>
    </Suspense>
  );
}
