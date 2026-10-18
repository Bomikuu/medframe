"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  HouseIcon,
  UsersIcon,
  SignOutIcon,
  CaretRightIcon,
  Settings,
  Stethoscope,
  PanelLeftClose,
  PanelLeftOpen,
} from "@/components/icons";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { requestWithCsrf, errorMessage } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { OrganizationSwitcher } from "./organization-switcher";
import { useWorkspace } from "./workspace-provider";
import { useSafety } from "./safety-provider";
import { useTheme } from "@/features/branding/theme-provider";
import { SecureImage } from "@/features/documents/secure-image";
import { Notifications } from "./notifications";

export function ClinicShell({ children }: { children: ReactNode }) {
  const { overview, organizationId, switchOrganization, href, can } = useWorkspace();
  const { guard } = useSafety();
  const router = useRouter();
  const pathname = usePathname();
  const patients = pathname.startsWith("/clinic/patients");
  const consultations = pathname.startsWith("/clinic/consultations");
  const settings = pathname.startsWith("/clinic/settings");
  const { theme, personal } = useTheme();
  const [collapsedOverride, setCollapsedOverride] = useState<boolean | null>(null);
  const collapsed = collapsedOverride ?? personal.sidebar_collapsed;
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
    <div
      className={cn(
        "min-h-dvh lg:grid",
        collapsed ? "lg:grid-cols-[80px_1fr]" : "lg:grid-cols-[var(--sidebar-width)_1fr]",
      )}
    >
      <aside className="flex flex-col border-b border-border bg-card px-5 py-6 lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="px-2">
          <div className={collapsed ? "lg:hidden" : ""}>
            {theme.logo_id ? (
              <SecureImage id={theme.logo_id} alt="Clinic logo" className="h-12 max-w-44" />
            ) : (
              <Brand />
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="mt-4 hidden self-start lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsedOverride(!collapsed)}
        >
          {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </Button>
        <div className={cn("mt-8", collapsed && "lg:hidden")}>
          <OrganizationSwitcher
            organizations={overview.myOrganizations}
            value={organizationId}
            onChange={switchOrganization}
          />
        </div>
        <nav aria-label="Clinic navigation" className="mt-7 flex flex-wrap gap-2 lg:flex-col">
          {[
            {
              path: "/clinic",
              label: "Overview",
              Icon: HouseIcon,
              active: pathname === "/clinic",
              show: true,
            },
            {
              path: "/clinic/patients",
              label: "Patients",
              Icon: UsersIcon,
              active: patients,
              show: can("patients.demographics.read"),
            },
            {
              path: "/clinic/consultations",
              label: "Consultations",
              Icon: Stethoscope,
              active: consultations,
              show: can("patients.clinical.read"),
            },
            {
              path: "/clinic/settings/templates",
              label: "Templates",
              Icon: Stethoscope,
              active: pathname.startsWith("/clinic/settings/templates"),
              show: can("encounters.write"),
            },
            {
              path: "/clinic/settings/appearance",
              label: "Appearance",
              Icon: Settings,
              active: settings && !pathname.startsWith("/clinic/settings/templates"),
              show: true,
            },
          ]
            .filter((item) => item.show)
            .map(({ path, label, Icon, active }) => (
              <Link
                key={path}
                href={href(path)}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-muted",
                  active && "bg-secondary text-secondary-foreground",
                )}
              >
                <Icon size={19} />
                <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
              </Link>
            ))}
        </nav>
        <div
          className={cn(
            "mt-auto hidden border-t border-border px-2 pt-6",
            !collapsed && "lg:block",
          )}
        >
          <p className="text-xs leading-5 text-muted-foreground">
            The Foundation of
            <br />
            Modern Care.
          </p>
        </div>
      </aside>
      <div className="min-w-0">
        <header
          className={cn(
            "flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-6 lg:px-10",
            theme.header === "compact" ? "py-3" : "py-5",
          )}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Clinical workspace</span>
            <CaretRightIcon size={13} />
            <span className="text-foreground">
              {patients
                ? "Patients"
                : consultations
                  ? "Consultations"
                  : settings
                    ? pathname.startsWith("/clinic/settings/templates")
                      ? "Templates"
                      : "Appearance"
                    : "Overview"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Notifications />
            <Button
              type="button"
              variant="ghost"
              onClick={() => void guard(() => router.push("/portal/login"))}
            >
              Patient sign in
            </Button>
            {personal.avatar_id && (
              <SecureImage
                id={personal.avatar_id}
                avatar
                alt="Your profile image"
                className="size-10"
              />
            )}
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
        <main
          id="main"
          data-density-region
          className={cn(
            "mx-auto px-6 py-8 lg:px-10 lg:py-10",
            theme.content_width === "contained" ? "max-w-7xl" : "max-w-none",
          )}
        >
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
