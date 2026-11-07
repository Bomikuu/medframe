"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import {
  CalendarDays,
  House,
  ListOrdered,
  Stethoscope,
  Users,
  ReceiptText,
  MessageSquare,
  MonitorSmartphone,
} from "lucide-react";
import { Brand, BrandMark } from "@/components/brand";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./workspace-provider";
import { useTheme } from "@/features/branding/theme-provider";
import { ClinicalLocaleProvider } from "@/components/application/clinical-locale";
import { ClinicPageLoading } from "./clinic-page-loading";
import { ClinicNavigation } from "./clinic-navigation";
import { SidebarAccount } from "./sidebar-account";
import { WorkspaceHeaderActions } from "./workspace-header-actions";
import { WorkspaceActionsDialog } from "./workspace-actions-dialog";

export function ClinicShell({ children }: { children: ReactNode }) {
  const { workspace } = useWorkspace();
  const { personal, theme } = useTheme();
  const [open, setOpen] = useState<boolean | undefined>();
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${theme.sidebar_width}px`,
          "--sidebar-width-icon": "4.5rem",
        } as CSSProperties
      }
      open={open ?? !personal.sidebar_collapsed}
      onOpenChange={setOpen}
    >
      <ClinicalLocaleProvider timezone={workspace.organization.timezone}>
        <ClinicFrame>{children}</ClinicFrame>
      </ClinicalLocaleProvider>
    </SidebarProvider>
  );
}

function ClinicFrame({ children }: { children: ReactNode }) {
  const { organizationId, branchId, href, can, workspace } = useWorkspace();
  const { setOpenMobile } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const [destination, setDestination] = useState<{ path: string; label: string } | null>(null);
  const navigationPending = isNavigating && destination !== null && destination.path !== pathname;
  const [hub, setHub] = useState<{ mode: "actions" | "settings"; search?: string } | null>(null);
  const actionTrigger = useRef<HTMLButtonElement>(null);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState("");
  const groups = [
    {
      label: "Workspace",
      links: [{ path: "/clinic", label: "Dashboard", Icon: House, show: true }],
    },
    {
      label: "Clinical",
      links: [
        {
          path: "/clinic/patients",
          label: "Patients",
          Icon: Users,
          show: can("patients.demographics.read"),
        },
        {
          path: "/clinic/consultations",
          label: "Consultations",
          Icon: Stethoscope,
          show: can("patients.clinical.read"),
        },
        {
          path: "/clinic/diagnostics",
          label: "Diagnostics",
          Icon: ReceiptText,
          show: can("diagnostics.read"),
        },
        {
          path: "/clinic/diagnostic-inbox",
          label: "Diagnostic inbox",
          Icon: ReceiptText,
          show: can("diagnostics.center.work"),
        },
      ],
    },
    {
      label: "Operations",
      links: [
        {
          path: "/clinic/appointments",
          label: "Appointments",
          Icon: CalendarDays,
          show: can("operations.read"),
        },
        { path: "/clinic/queue", label: "Queue", Icon: ListOrdered, show: can("operations.read") },
        {
          path: "/clinic/stations",
          label: "Patient Stations",
          Icon: MonitorSmartphone,
          show: can("operations.read"),
        },
      ],
    },
    {
      label: "Finance & communication",
      links: [
        {
          path: "/clinic/services",
          label: "Services",
          Icon: ReceiptText,
          show: can("services.read"),
        },
        { path: "/clinic/billing", label: "Billing", Icon: ReceiptText, show: can("billing.read") },
        {
          path: "/clinic/communications",
          label: "Communications",
          Icon: MessageSquare,
          show: can("communications.manage"),
        },
      ],
    },
  ];
  const current = groups
    .flatMap((group) => group.links)
    .find((link) =>
      link.path === "/clinic" ? pathname === link.path : pathname.startsWith(link.path),
    );
  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border">
        <SidebarHeader className="gap-6 px-4 pt-7 pb-4 group-data-[collapsible=icon]:px-2">
          <div className="px-2 group-data-[collapsible=icon]:hidden">
            <Brand />
          </div>
          <span
            aria-label="Medframe"
            className="mx-auto hidden size-10 place-items-center group-data-[collapsible=icon]:grid"
          >
            <BrandMark className="size-10" />
          </span>
        </SidebarHeader>
        <SidebarContent className="gap-4 px-2 pt-2">
          <ClinicNavigation
            groups={groups}
            pathname={pathname}
            currentPath={current?.path}
            pendingPath={navigationPending ? destination?.path : undefined}
            navigate={(path, label) => {
              setOpenMobile(false);
              if (pathname === path) return;
              setDestination({ path, label });
              startNavigation(() => router.push(href(path)));
            }}
          />
        </SidebarContent>
        <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
          <SidebarAccount
            triggerRef={accountTrigger}
            onError={setError}
          />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-2 border-b border-border bg-card px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="size-11" />
            <Breadcrumb className="hidden lg:block">
              <BreadcrumbList className="flex-nowrap">
                <BreadcrumbItem className="hidden max-w-48 truncate text-xs sm:block">
                  {workspace.organization.name}
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="truncate">
                    {current?.label ??
                      (pathname.startsWith("/clinic/settings/") ? "Settings" : "Clinic")}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <WorkspaceHeaderActions
            key={`${organizationId}:${branchId}`}
            actionRef={actionTrigger}
            onActions={(search) => setHub({ mode: "actions", search })}
          />
        </header>
        {hub && (
          <WorkspaceActionsDialog
            key={`${organizationId}:${branchId}:${hub.mode}`}
            mode={hub.mode}
            close={() => setHub(null)}
            returnFocus={hub.mode === "settings" ? accountTrigger : actionTrigger}
            initialSearch={hub.search}
            currentPatientId={pathname.match(/^\/clinic\/patients\/([0-9a-f-]{36})(?:\/|$)/i)?.[1]}
          />
        )}
        <main
          id="main"
          data-density-region
          className={cn(
            "mx-auto w-full min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          )}
        >
          {error && (
            <p role="alert" className="mb-6 text-sm text-destructive">
              {error}
            </p>
          )}
          {navigationPending && (
            <ClinicPageLoading
              destination={destination.label}
              retry={() => startNavigation(() => router.push(href(destination.path)))}
            />
          )}
          {/* Keep drafts mounted while preparing a route; hide stale controls until it commits. */}
          <div hidden={navigationPending}>{children}</div>
        </main>
      </SidebarInset>
    </>
  );
}
