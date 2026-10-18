"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { HouseIcon, UsersIcon, SignOutIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { requestWithCsrf, errorMessage } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { OrganizationSwitcher } from "./organization-switcher";
import { useWorkspace } from "./workspace-provider";
import { useSafety } from "./safety-provider";

export function ClinicShell({ children }: { children: ReactNode }) {
  const { overview, organizationId, switchOrganization, href, can } = useWorkspace();
  const { guard } = useSafety();
  const router = useRouter();
  const pathname = usePathname();
  const patients = pathname.startsWith("/clinic/patients");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true);
    try {
      await requestWithCsrf("auth/logout", {});
      router.replace("/login");
      router.refresh();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="flex flex-col border-b border-border bg-card px-5 py-6 lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="px-2">
          <Brand />
        </div>
        <div className="mt-8">
          <OrganizationSwitcher
            organizations={overview.myOrganizations}
            value={organizationId}
            onChange={switchOrganization}
          />
        </div>
        <nav aria-label="Clinic navigation" className="mt-7 flex gap-2 lg:flex-col">
          {[
            { path: "/clinic", label: "Overview", Icon: HouseIcon, active: !patients, show: true },
            {
              path: "/clinic/patients",
              label: "Patients",
              Icon: UsersIcon,
              active: patients,
              show: can("patients.demographics.read"),
            },
          ]
            .filter((item) => item.show)
            .map(({ path, label, Icon, active }) => (
              <Link
                key={path}
                href={href(path)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-muted",
                  active && "bg-secondary text-secondary-foreground",
                )}
              >
                <Icon size={19} />
                {label}
              </Link>
            ))}
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
            <span className="text-foreground">{patients ? "Patients" : "Overview"}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{overview.currentUser.displayName}</span>
            <Button
              variant="ghost"
              onClick={() => {
                void guard(() => {
                  void logout();
                });
              }}
              disabled={busy}
              aria-busy={busy}
            >
              <SignOutIcon size={17} />
              Sign out
            </Button>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-6 py-8 lg:px-10 lg:py-10">
          {error && (
            <p role="alert" className="mb-6 text-sm text-destructive">
              {error}
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
