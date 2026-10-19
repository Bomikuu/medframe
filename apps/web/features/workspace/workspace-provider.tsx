"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  WorkspaceOverviewDocument,
  ClinicWorkspaceDocument,
  type ClinicWorkspaceQuery,
  type WorkspaceOverviewQuery,
} from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState, RemoteNotice } from "@/features/patients/feedback";
import { useSafety } from "./safety-provider";
import { ThemeProvider } from "@/features/branding/theme-provider";

import { SessionRecovery } from "@/features/auth/session-recovery";
import { PlatformLink } from "@/features/platform/clinic-invitations";

type Workspace = {
  organizationId: string;
  workspace: ClinicWorkspaceQuery["clinicWorkspace"];
  overview: WorkspaceOverviewQuery;
  can: (permission: string) => boolean;
  href: (path: string) => string;
  switchOrganization: (id: string) => void;
};
const WorkspaceContext = createContext<Workspace | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data, error, reload } = useRemote(WorkspaceOverviewDocument, {});
  const params = useSearchParams();
  if (!data)
    return (
      <main className="p-8">
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
      <main id="main" className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold">No organization assigned</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Contact your clinic administrator to arrange access.
        </p>
        <div className="mt-6">
          <PlatformLink />
        </div>
        <div className="mt-6">
          <SessionRecovery />
        </div>
      </main>
    );
  const requested = params.get("organization");
  const organizationId = requested ?? data.myOrganizations[0].id;
  if (!data.myOrganizations.some((org) => org.id === organizationId))
    return (
      <main id="main" className="p-8">
        <h1 className="text-2xl font-semibold">Workspace unavailable</h1>
        <p className="my-4 text-sm">
          Your organization access has changed. Choose an authorized clinic.
        </p>
        {data.myOrganizations.map((org) => (
          <a
            className="my-3 block text-primary underline"
            key={org.id}
            href={`/clinic?organization=${org.id}`}
          >
            {org.name}
          </a>
        ))}
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
  const value = useMemo<Workspace | null>(
    () =>
      data
        ? {
            organizationId,
            workspace: data.clinicWorkspace,
            overview,
            can: (permission) => data.clinicWorkspace.permissions.includes(permission),
            href: (path) => `${path}?organization=${organizationId}`,
            switchOrganization: (id) => {
              void guard(() => router.push(`/clinic/patients?organization=${id}`));
            },
          }
        : null,
    [data, overview, organizationId, guard, router],
  );
  if (!value)
    return (
      <main id="main" className="p-8">
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
      <div key={value.workspace.permissions.join("|")}>
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
