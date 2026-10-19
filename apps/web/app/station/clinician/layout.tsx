import { Suspense } from "react";
import { cookies } from "next/headers";
import { SafetyProvider } from "@/features/workspace/safety-provider";
import { WorkspaceProvider } from "@/features/workspace/workspace-provider";
import { StationShell } from "@/features/stations/station-shell";
import { ButtonLink } from "@/components/ui/button-link";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  if (!store.has("medframe_django_session"))
    return (
      <main id="main" className="mx-auto grid max-w-lg gap-5 p-8 pt-20">
        <h1 className="text-2xl font-semibold">Sign in to clinician Station</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Use your own staff account and MFA. Then return to Station on this device. Pairing alone
          does not grant clinical access.
        </p>
        <ButtonLink href="/login">Staff sign in</ButtonLink>
        <ButtonLink href="/station" variant="outline">
          Device setup
        </ButtonLink>
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
          <StationShell>{children}</StationShell>
        </WorkspaceProvider>
      </SafetyProvider>
    </Suspense>
  );
}
