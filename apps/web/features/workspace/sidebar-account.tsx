"use client";

import { useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { SecureImage } from "@/features/documents/secure-image";
import { useTheme } from "@/features/branding/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { errorMessage, requestWithCsrf } from "@/lib/auth/client";
import { settingsGroups } from "@/features/settings/settings-catalog";
import { ClinicSwitcherDialog } from "./clinic-switcher-dialog";
import { useWorkspace } from "./workspace-provider";
import { useSafety } from "./safety-provider";

export function SidebarAccount({
  triggerRef,
  onError,
}: {
  triggerRef: RefObject<HTMLButtonElement | null>;
  onError: (message: string) => void;
}) {
  const { overview, workspace, organizationId, branchId, href, can } = useWorkspace();
  const { personal } = useTheme();
  const { guard } = useSafety();
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [clinicOpen, setClinicOpen] = useState(false);
  const transferring = useRef(false);
  const groups = settingsGroups.flatMap((group) => {
    const destination = group.tabs.find((tab) => !tab.permission || can(tab.permission));
    return destination ? [{ ...group, destination }] : [];
  });
  const name = overview.currentUser.displayName;
  const branch = workspace.branches.find((item) => item.id === branchId)?.name;
  async function logout() {
    setBusy(true);
    onError("");
    try {
      await requestWithCsrf("auth/logout", {});
      router.replace("/login");
      router.refresh();
    } catch (failure) {
      onError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="ghost"
            aria-label="Account menu"
            className="h-auto min-h-16 w-full min-w-0 justify-start gap-3 rounded-xl px-3 py-3 text-left group-data-[collapsible=icon]:min-h-12 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1 hover:bg-secondary"
          >
            <span className="inline-flex size-10 shrink-0 overflow-hidden rounded-full bg-secondary">
              {personal.avatar_id ? (
                <SecureImage
                  id={personal.avatar_id}
                  avatar
                  alt="Your profile image"
                  fallback={<PatientAvatar name={name} className="size-full border-0" />}
                  className="size-full object-cover"
                />
              ) : (
                <PatientAvatar name={name} className="size-full border-0 text-sm" />
              )}
            </span>
            <span className="grid min-w-0 flex-1 gap-1 group-data-[collapsible=icon]:hidden">
              <span className="truncate text-xs font-semibold">{name}</span>
              <span className="truncate text-[11px] text-muted-foreground">
                {branch || workspace.organization.name}
              </span>
            </span>
            <ChevronsUpDown
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={isMobile ? "top" : "right"}
          align="end"
          sideOffset={12}
          className="w-72 max-w-[calc(100vw-2rem)]"
          onCloseAutoFocus={(event) => {
            if (transferring.current) {
              event.preventDefault();
              transferring.current = false;
            }
          }}
        >
          <DropdownMenuLabel className="grid gap-1 p-3">
            <span className="truncate font-semibold">{name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {workspace.organization.name}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {groups.map((group) => (
            <DropdownMenuItem
              key={group.id}
              className="min-h-11 gap-3"
              onSelect={() => void guard(() => router.push(href(group.destination.path)))}
            >
              <group.destination.icon aria-hidden />
              {group.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="min-h-11 gap-3"
            onSelect={() => {
              transferring.current = true;
              setClinicOpen(true);
            }}
          >
            <Building2 aria-hidden />
            Clinic & branches
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-11 gap-3"
            onSelect={() => void guard(() => router.push("/portal/login"))}
          >
            <UserRound aria-hidden />
            Patient portal sign in
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="min-h-11 gap-3"
            disabled={busy}
            onSelect={() => void guard(() => void logout())}
          >
            <LogOut aria-hidden />
            {busy ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ClinicSwitcherDialog
        key={organizationId}
        open={clinicOpen}
        onOpenChange={setClinicOpen}
        returnFocus={triggerRef}
      />
    </>
  );
}
