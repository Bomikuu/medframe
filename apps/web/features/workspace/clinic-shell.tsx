"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientError } from "graphql-request";
import {
  BuildingsIcon,
  HouseIcon,
  SignOutIcon,
  ArrowClockwiseIcon,
  LockKeyIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { requestWithCsrf, errorMessage } from "@/lib/auth/client";
import { getGraphqlClient } from "@/lib/graphql/client";
import {
  ClinicWorkspaceDocument,
  WorkspaceOverviewDocument,
  type ClinicWorkspaceQuery,
  type WorkspaceOverviewQuery,
} from "@/lib/graphql/generated";
import { OrganizationSwitcher } from "./organization-switcher";

export function ClinicShell() {
  const router = useRouter();
  const [overview, setOverview] = useState<WorkspaceOverviewQuery | null>(null);
  const [workspace, setWorkspace] = useState<ClinicWorkspaceQuery["clinicWorkspace"] | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await getGraphqlClient().request(WorkspaceOverviewDocument);
      setError("");
      setOverview(data);
      setOrganizationId((current) =>
        data.myOrganizations.some((org) => org.id === current)
          ? current
          : (data.myOrganizations[0]?.id ?? ""),
      );
    } catch (failure) {
      setWorkspace(null);
      setOverview(null);
      if (failure instanceof ClientError && failure.response.status === 401) {
        router.replace("/login");
      } else setError("Your workspace could not be loaded. Check your connection and try again.");
    }
  }, [router]);

  useEffect(() => {
    // Load remote identity on mount; this is not state derived from a render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const onFocus = () => {
      setWorkspace(null);
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useEffect(() => {
    let active = true;
    if (!organizationId) return;
    getGraphqlClient()
      .request(ClinicWorkspaceDocument, { organizationId })
      .then((data) => {
        if (active) setWorkspace(data.clinicWorkspace);
      })
      .catch(() => {
        if (active) {
          setWorkspace(null);
          setError(
            "This workspace is unavailable or your access has changed. Try again or contact your administrator.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [organizationId, overview]);

  async function logout() {
    setBusy(true);
    try {
      await requestWithCsrf("auth/logout", {});
      setWorkspace(null);
      setOverview(null);
      router.replace("/login");
      router.refresh();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  function switchOrganization(id: string) {
    setWorkspace(null);
    setError("");
    setOrganizationId(id);
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="flex flex-col border-b border-border bg-card px-5 py-6 lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="px-2">
          <Brand />
        </div>
        <div className="mt-8">
          {overview?.myOrganizations.length ? (
            <OrganizationSwitcher
              organizations={overview.myOrganizations}
              value={organizationId}
              onChange={switchOrganization}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Clinical workspace</p>
          )}
        </div>
        <nav aria-label="Clinic navigation" className="mt-7">
          <a
            href="/clinic"
            aria-current="page"
            className="flex items-center gap-3 rounded-lg bg-secondary px-3 py-3 text-sm font-medium text-secondary-foreground"
          >
            <HouseIcon size={19} />
            Overview
          </a>
        </nav>
        <div className="mt-auto hidden border-t border-border px-2 pt-6 lg:block">
          <p className="text-xs leading-5 text-muted-foreground">
            The Foundation of
            <br />
            Modern Care.
          </p>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-6 py-5 lg:px-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Clinical workspace</span>
            <CaretRightIcon size={13} />
            <span className="text-foreground">Overview</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{overview?.currentUser.displayName}</span>
            <Button variant="ghost" size="sm" onClick={logout} disabled={busy} aria-busy={busy}>
              <SignOutIcon size={17} />
              {busy ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-6 py-8 lg:px-10 lg:py-12">
          <div className="mb-10">
            <h1 className="text-3xl font-semibold tracking-tight">Your clinic workspace</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              A secure starting point for your clinical work.
            </p>
          </div>
          {error ? (
            <section className="max-w-xl rounded-xl border border-destructive/30 p-6">
              <p role="alert" className="text-sm leading-6 text-destructive">
                {error}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setWorkspace(null);
                  void refresh();
                }}
                className="mt-4"
              >
                <ArrowClockwiseIcon size={17} />
                Try again
              </Button>
            </section>
          ) : !overview ? (
            <WorkspaceSkeleton />
          ) : !overview.myOrganizations.length ? (
            <section className="max-w-xl rounded-xl border border-border p-8">
              <BuildingsIcon size={30} className="mb-5 text-primary" />
              <h2 className="text-xl font-semibold">No organization assigned</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Contact your clinic administrator to arrange access. Your account does not currently
                have an active clinic membership.
              </p>
            </section>
          ) : !workspace ? (
            <WorkspaceSkeleton />
          ) : (
            <div className="grid gap-8">
              <section className="grid gap-6 rounded-xl border border-border bg-card p-6 sm:p-8 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
                    <BuildingsIcon size={26} />
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {workspace.organization.name}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    You’re connected to your authorized organization.
                  </p>
                </div>
                <div className="md:border-l md:border-border md:pl-8">
                  <h3 className="text-sm font-medium">Your branches</h3>
                  <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    {workspace.branches.map((branch) => (
                      <li key={branch.id}>{branch.name}</li>
                    ))}
                  </ul>
                </div>
              </section>
              <section className="max-w-2xl px-1 py-2">
                <div className="mb-4 flex items-center gap-3">
                  <LockKeyIcon size={20} className="text-primary" />
                  <h2 className="text-lg font-semibold">Your foundation is ready</h2>
                </div>
                <p className="text-sm leading-7 text-muted-foreground">
                  Secure sign-in and organization access are available. Patient registration and
                  clinical records are the next part of your workspace. No patient data has been
                  added to this release.
                </p>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div role="status" aria-label="Loading workspace" className="grid gap-4">
      <div className="h-56 animate-pulse rounded-xl bg-muted" />
      <div className="h-5 w-3/5 animate-pulse rounded bg-muted" />
      <span className="sr-only">Loading workspace</span>
    </div>
  );
}
