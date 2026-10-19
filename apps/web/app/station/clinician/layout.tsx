import { Suspense } from "react";
import { redirect } from "next/navigation";
import { readBrowserSession } from "@/lib/server/session-route";
import { SessionUnavailable } from "@/features/auth/session-recovery";
import { SafetyProvider } from "@/features/workspace/safety-provider";
import { WorkspaceProvider } from "@/features/workspace/workspace-provider";
import { StationShell } from "@/features/stations/station-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { StationSessionBoundary } from "@/features/stations/access-session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await readBrowserSession();
  if (!session) return <SessionUnavailable />;
  if (session.kind === "patient" || session.kind === "device") redirect(session.destination);
  if (!session.authenticated)
    return (
      <main id="main" className="mx-auto grid max-w-lg gap-5 p-8 pt-20">
        <h1 className="text-2xl font-semibold">Open Station with a code</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Ask the doctor to choose Connect my device from Station home on their signed-in computer.
          Enter their code on this approved tablet to open the clinical workspace.
        </p>
        <ButtonLink href="/station">Enter Station code</ButtonLink>
      </main>
    );
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8">
          Opening your clinic Station…
        </p>
      }
    >
      <SafetyProvider>
        <WorkspaceProvider>
          <StationSessionBoundary>
            <StationShell>{children}</StationShell>
          </StationSessionBoundary>
        </WorkspaceProvider>
      </SafetyProvider>
    </Suspense>
  );
}
