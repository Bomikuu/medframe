"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  House,
  ListOrdered,
  LogOut,
  Palette,
  Settings,
  Stethoscope,
  Users,
  FileText,
  HeartPulse,
  ShieldCheck,
  ReceiptText,
  MessageSquare,
  MonitorSmartphone,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { requestWithCsrf, errorMessage } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { ClinicSwitcherDialog } from "./clinic-switcher-dialog";
import { useWorkspace } from "./workspace-provider";
import { useSafety } from "./safety-provider";
import { useTheme } from "@/features/branding/theme-provider";
import { SecureImage } from "@/features/documents/secure-image";
import { Notifications } from "./notifications";
import { ClinicalLocaleProvider } from "@/components/application/clinical-locale";

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
  const { overview, organizationId, href, can, workspace } = useWorkspace();
  const { guard } = useSafety();
  const { setOpenMobile } = useSidebar();
  const { theme, personal } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [clinicDialogOpen, setClinicDialogOpen] = useState(false);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const openingClinicDialog = useRef(false);
  const [error, setError] = useState("");
  const groups = [
    {
      label: "Workspace",
      links: [
        { path: "/clinic", label: "Dashboard", Icon: House, show: true },
        {
          path: "/clinic/analytics",
          label: "Analytics",
          Icon: FileText,
          show: can("operations.read") || can("patients.clinical.read") || can("billing.read"),
        },
      ],
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
      ],
    },
    {
      label: "Finance & communication",
      links: [
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
        {
          path: "/clinic/settings/diagnostic-centers",
          label: "Diagnostic centers",
          Icon: ReceiptText,
          show: can("diagnostics.partners.manage"),
        },
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
    {
      label: "Settings",
      links: [
        {
          path: "/clinic/stations",
          label: "Patient Stations",
          Icon: MonitorSmartphone,
          show: can("operations.read"),
        },
        {
          path: "/clinic/settings/stations",
          label: "Devices & Stations",
          Icon: MonitorSmartphone,
          show: can("organization.manage"),
        },
        {
          path: "/clinic/settings/schedules",
          label: "Schedules",
          Icon: Settings,
          show: can("schedules.manage"),
        },
        {
          path: "/clinic/settings/templates",
          label: "Templates",
          Icon: FileText,
          show: can("encounters.write"),
        },
        {
          path: "/clinic/settings/specialties",
          label: "Specialties",
          Icon: Stethoscope,
          show: can("organization.manage"),
        },
        {
          path: "/clinic/settings/website",
          label: "Clinic website",
          Icon: Palette,
          show: can("organization.manage"),
        },
        { path: "/clinic/settings/appearance", label: "Appearance", Icon: Palette, show: true },
      ],
    },
  ];
  const current = groups
    .flatMap((group) => group.links)
    .find((link) =>
      link.path === "/clinic" ? pathname === link.path : pathname.startsWith(link.path),
    );
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
    <>
      <Sidebar collapsible="icon" className="border-r border-border">
        <SidebarHeader className="gap-6 px-4 pt-7 pb-4 group-data-[collapsible=icon]:px-2">
          <div className="px-2 group-data-[collapsible=icon]:hidden">
            <Brand />
          </div>
          <span
            aria-label="Medframe"
            className="mx-auto hidden size-10 place-items-center rounded-xl bg-primary text-primary-foreground group-data-[collapsible=icon]:grid"
          >
            <HeartPulse className="size-6" />
          </span>
        </SidebarHeader>
        <SidebarContent className="gap-4 px-2 pt-2">
          {groups.map(
            (group) =>
              group.links.some((link) => link.show) && (
                <SidebarGroup key={group.label} className="py-1">
                  <SidebarGroupLabel className="mb-2 px-3 text-xs font-semibold text-muted-foreground">
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarMenu>
                    {group.links
                      .filter((link) => link.show)
                      .map(({ path, label, Icon }) => (
                        <SidebarMenuItem key={path}>
                          <SidebarMenuButton
                            asChild
                            isActive={current?.path === path}
                            tooltip={label}
                            className="gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:text-foreground data-[active=true]:font-semibold data-[active=true]:text-teal-ink"
                          >
                            <Link
                              href={href(path)}
                              aria-current={current?.path === path ? "page" : undefined}
                              onClick={() => setOpenMobile(false)}
                            >
                              <Icon className="size-[18px]" />
                              <span>{label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                  </SidebarMenu>
                </SidebarGroup>
              ),
          )}
        </SidebarContent>
        <SidebarFooter className="border-t border-border p-5 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-4 text-teal-ink" />
            Clinical workspace
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            The Foundation of Modern Care.
          </p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-2 border-b border-border bg-card px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="size-11" />
            <Breadcrumb>
              <BreadcrumbList className="flex-nowrap">
                <BreadcrumbItem className="hidden max-w-48 truncate text-xs sm:block">
                  {workspace.organization.name}
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="truncate">{current?.label ?? "Clinic"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Notifications />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-2 rounded-xl border-l border-border px-2 sm:pl-4"
                  aria-label="Account menu"
                  ref={accountTrigger}
                >
                  {personal.avatar_id ? (
                    <SecureImage
                      id={personal.avatar_id}
                      avatar
                      alt="Your profile image"
                      className="size-8"
                    />
                  ) : (
                    <PatientAvatar name={overview.currentUser.displayName} className="size-8" />
                  )}
                  <span className="hidden max-w-28 truncate text-sm font-medium lg:block">
                    {overview.currentUser.displayName}
                  </span>
                  <ChevronDown className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64"
                onCloseAutoFocus={(event) => {
                  if (openingClinicDialog.current) {
                    event.preventDefault();
                    openingClinicDialog.current = false;
                  }
                }}
              >
                <DropdownMenuLabel className="truncate">
                  {overview.currentUser.displayName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="items-start gap-3 py-3"
                  onSelect={() => {
                    openingClinicDialog.current = true;
                    setClinicDialogOpen(true);
                  }}
                >
                  <Building2 aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-ink" />
                  <span className="grid min-w-0 gap-1">
                    <span>Clinic & branches</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {workspace.organization.name}
                    </span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() =>
                    void guard(() => router.push(href("/clinic/settings/appearance")))
                  }
                >
                  Display preferences
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void guard(() => router.push("/portal/login"))}>
                  Patient portal sign in
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={busy} onSelect={() => void guard(() => void logout())}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <ClinicSwitcherDialog
          key={organizationId}
          open={clinicDialogOpen}
          onOpenChange={setClinicDialogOpen}
          returnFocus={accountTrigger}
        />
        <main
          id="main"
          data-density-region
          className={cn(
            "mx-auto w-full min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
            theme.content_width === "contained" ? "max-w-[1440px]" : "max-w-none",
          )}
        >
          {error && (
            <p role="alert" className="mb-6 text-sm text-destructive">
              {error}
            </p>
          )}
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
