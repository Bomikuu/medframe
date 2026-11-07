"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  WorkspaceOverviewDocument,
  ClinicWorkspaceDocument,
  type ClinicWorkspaceQuery,
  type WorkspaceOverviewQuery,
} from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { WorkspaceLoading } from "@/components/application/workspace-loading";
import { LoadState, RemoteNotice } from "@/features/patients/feedback";
import { useSafety } from "./safety-provider";
import { ThemeProvider } from "@/features/branding/theme-provider";

import { SessionRecoveryOptions } from "@/features/auth/session-recovery";
import { RecoveryState } from "@/components/application/recovery-state";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { PlatformLink } from "@/features/platform/clinic-invitations";

type Workspace = {
  organizationId: string;
  workspace: ClinicWorkspaceQuery["clinicWorkspace"];
  overview: WorkspaceOverviewQuery;
  can: (permission: string) => boolean;
  href: (path: string) => string;
  switchOrganization: (id: string) => void;
  branchId: string;
  switchBranch: (id: string) => void;
};
const WorkspaceContext = createContext<Workspace | null>(null);

export function WorkspaceProvider({
  children,
  pinnedOrganizationId,
}: {
  children: ReactNode;
  pinnedOrganizationId?: string;
}) {
  const { data, error, reload } = useRemote(WorkspaceOverviewDocument, {});
  const params = useSearchParams();
  useEffect(() => {
    window.addEventListener("medframe:account-updated", reload);
    return () => window.removeEventListener("medframe:account-updated", reload);
  }, [reload]);
  if (!data && !error)
    return (
      <WorkspaceLoading
        title="Finding your clinics"
        detail="Checking the clinic memberships available to your account."
        retry={reload}
      />
    );
  if (!data)
    return (
      <main id="main" className="grid min-h-svh place-items-center p-6">
        <LoadState
          error={error}
          retry={reload}
          title="Finding your clinics"
          detail="Retrieving the clinics assigned to your account and checking your current membership."
        />
      </main>
    );
  if (!data.myOrganizations.length)
    return (
      <main id="main" className="grid min-h-svh place-items-center px-5 py-8">
        <RecoveryState
          level={1}
          icon={Building2}
          title="No clinic is assigned"
          description="You’re signed in, but this account has no active clinic membership. Contact your clinic administrator to arrange access."
        >
          <PlatformLink />
          <SessionRecoveryOptions showWorkspace={false} />
        </RecoveryState>
      </main>
    );
  const requested = pinnedOrganizationId ?? params.get("organization");
  const organizationId = requested ?? data.myOrganizations[0].id;
  if (!data.myOrganizations.some((org) => org.id === organizationId))
    return (
      <main id="main" className="grid min-h-svh place-items-center px-5 py-8">
        <RecoveryState
          level={1}
          icon={Building2}
          title="This clinic workspace is unavailable"
          description="Your clinic access may have changed. Choose one of the clinics currently available to your account."
        >
          <div className="grid gap-3">
            {data.myOrganizations.map((org) => (
              <Button asChild variant="outline" key={org.id}>
                <a href={`/clinic?organization=${org.id}`}>
                  <Building2 aria-hidden="true" />
                  {org.name}
                </a>
              </Button>
            ))}
          </div>
        </RecoveryState>
      </main>
    );
  return (
    <OrganizationWorkspace key={organizationId} overview={data} organizationId={organizationId}>
      <RemoteNotice error={error} retry={reload} />
      {children}
    </OrganizationWorkspace>
  );
}

function OrganizationWorkspace({
  organizationId,
  overview,
  children,
}: {
  organizationId: string;
  overview: WorkspaceOverviewQuery;
  children: ReactNode;
}) {
  const { data, error, reload } = useRemote(ClinicWorkspaceDocument, { organizationId });
  const router = useRouter();
  const { guard } = useSafety();
  const pathname = usePathname();
  const params = useSearchParams();
  const branches = data?.clinicWorkspace.branches ?? [];
  const [lastBranch, setLastBranch] = useState<string | null>(null);
  const requestedBranch = branches.find((branch) => branch.id === params.get("branch"))?.id;
  const branchId =
    requestedBranch ??
    branches.find((branch) => branch.id === lastBranch)?.id ??
    branches[0]?.id ??
    "";
  useEffect(() => {
    if (requestedBranch) setLastBranch(requestedBranch);
  }, [requestedBranch]);
  const value = useMemo<Workspace | null>(
    () =>
      data
        ? {
            organizationId,
            workspace: data.clinicWorkspace,
            overview,
            can: (permission) => data.clinicWorkspace.permissions.includes(permission),
            branchId,
            href: (path) =>
              `${path}?organization=${organizationId}${branchId ? `&branch=${branchId}` : ""}`,
            switchBranch: (id) => {
              if (!branches.some((branch) => branch.id === id)) return;
              void guard(() => {
                const next = new URLSearchParams(params.toString());
                next.set("branch", id);
                router.replace(`${pathname}?${next.toString()}`);
              });
            },
            switchOrganization: (id) => {
              void guard(() => router.push(`/clinic/patients?organization=${id}`));
            },
          }
        : null,
    [data, overview, organizationId, guard, router, branchId, pathname, params],
  );
  if (!value && !error)
    return (
      <WorkspaceLoading
        title="Opening your clinic"
        detail="Loading your permitted branches, role and workspace tools."
        retry={reload}
      />
    );
  if (!value)
    return (
      <main id="main" className="grid min-h-svh place-items-center p-6">
        <LoadState
          error={error}
          retry={reload}
          title="Opening the selected clinic"
          detail="Loading your permitted branches, role and workspace tools. This check does not change your access."
        />
      </main>
    );
  return (
    <WorkspaceContext.Provider value={value}>
      <div key={`${value.branchId}:${value.workspace.permissions.join("|")}`}>
        <RemoteNotice error={error} retry={reload} />
        <ThemeProvider organizationId={organizationId}>{children}</ThemeProvider>
      </div>
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("WorkspaceProvider is required");
  return value;
}
