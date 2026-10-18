"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import {
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
import { OrganizationSwitcher } from "./organization-switcher";
import { useWorkspace } from "./workspace-provider";
import { useSafety } from "./safety-provider";
import { useTheme } from "@/features/branding/theme-provider";
import { SecureImage } from "@/features/documents/secure-image";
import { Notifications } from "./notifications";

export function ClinicShell({ children }: { children: ReactNode }) {
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
      <ClinicFrame>{children}</ClinicFrame>
    </SidebarProvider>
  );
}

function ClinicFrame({ children }: { children: ReactNode }) {
  const { overview, organizationId, switchOrganization, href, can } = useWorkspace();
  const { guard } = useSafety();
  const { setOpenMobile } = useSidebar();
  const { theme, personal } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
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
      label: "Settings",
      links: [
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
        <SidebarHeader className="gap-6 px-4 py-6 group-data-[collapsible=icon]:px-2">
          <div className="px-2 group-data-[collapsible=icon]:hidden">
            {theme.logo_id ? (
              <SecureImage id={theme.logo_id} alt="Clinic logo" className="h-10 max-w-44" />
            ) : (
              <Brand />
            )}
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <OrganizationSwitcher
              organizations={overview.myOrganizations}
              value={organizationId}
              onChange={switchOrganization}
            />
          </div>
        </SidebarHeader>
        <SidebarContent className="gap-3 px-2">
          {groups.map(
            (group) =>
              group.links.some((link) => link.show) && (
                <SidebarGroup key={group.label} className="py-1">
                  <SidebarGroupLabel className="mb-1 px-2 text-[11px] font-semibold tracking-wider uppercase">
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
                            className="gap-3 rounded-lg px-3 text-sm data-[active=true]:font-semibold"
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
          <p className="text-xs leading-5 text-muted-foreground">The Foundation of Modern Care.</p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-2 border-b border-border bg-card px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="size-11" />
            <Breadcrumb>
              <BreadcrumbList className="flex-nowrap">
                <BreadcrumbItem className="hidden sm:block">Workspace</BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="truncate">{current?.label ?? "Clinic"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Notifications />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-2 px-1.5"
                  aria-label="Account menu"
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
                  <span className="hidden max-w-40 truncate md:block">
                    {overview.currentUser.displayName}
                  </span>
                  <ChevronDown className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="truncate">
                  {overview.currentUser.displayName}
                </DropdownMenuLabel>
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
