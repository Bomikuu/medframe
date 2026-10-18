import { Suspense } from "react";
import { SafetyProvider } from "@/features/workspace/safety-provider";
import { WorkspaceProvider } from "@/features/workspace/workspace-provider";
import { ClinicShell } from "@/features/workspace/clinic-shell";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (!cookieStore.has("medframe_session")) redirect("/login");
  // Cookie presence only avoids a useless loading state. The API authorizes all data.
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
