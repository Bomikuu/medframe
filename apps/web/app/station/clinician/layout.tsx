import { Suspense } from "react";
import { cookies } from "next/headers";
import { SafetyProvider } from "@/features/workspace/safety-provider";
import { WorkspaceProvider } from "@/features/workspace/workspace-provider";
import { StationShell } from "@/features/stations/station-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { StationSessionBoundary } from "@/features/stations/access-session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  if (!store.has("medframe_django_session"))
    return (
      <main id="main" className="mx-auto grid max-w-lg gap-5 p-8 pt-20">
        <h1 className="text-2xl font-semibold">Open Station with a code</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Ask the clinician to generate a handoff code from their signed-in computer. Enter it on
          this approved tablet to open the assigned consultation.
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
