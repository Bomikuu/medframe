"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, Pin, PinOff, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useWorkspace } from "./workspace-provider";
import { cn } from "@/lib/utils";

// Temporarily hide pin controls without deleting this browser's saved pages.
const PIN_CONTROLS_ENABLED = false;

type NavigationLink = { path: string; label: string; Icon: LucideIcon; show: boolean };
type NavigationGroup = { label: string; links: NavigationLink[] };

export function ClinicNavigation({
  groups,
  pathname,
  currentPath,
  pendingPath,
  navigate,
}: {
  groups: NavigationGroup[];
  pathname: string;
  currentPath?: string;
  pendingPath?: string;
  navigate: (path: string, label: string) => void;
}) {
  const { href, organizationId, overview } = useWorkspace();
  const { state } = useSidebar();
  const storageKey = `medframe:navigation:${overview.currentUser.id}:${organizationId}`;
  const [preference, setPreference] = useState<{ key: string; pins: string[] }>({
    key: "",
    pins: [],
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const all = groups.flatMap((group) => group.links).filter((link) => link.show);
  const pins = preference.key === storageKey ? preference.pins : [];
  const pinned = pins.flatMap((path) => all.filter((link) => link.path === path));
  const settingsActive = groups
    .find((group) => group.label === "Settings")
    ?.links.some((link) => link.path === currentPath);

  useEffect(() => {
    let paths: string[] = [];
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(saved))
        paths = [
          ...new Set(
            saved.filter(
              (item): item is string => typeof item === "string" && item.startsWith("/clinic"),
            ),
          ),
        ].slice(0, 6);
    } catch {
      // Storage may be blocked. Pins still work for this mounted workspace.
    }
    setPreference({ key: storageKey, pins: paths });
  }, [storageKey]);

  useEffect(() => {
    if (settingsActive) setSettingsOpen(true);
  }, [pathname, settingsActive]);

  function togglePin(path: string) {
    if (!pins.includes(path) && pinned.length >= 6) {
      toast.info("You can pin up to six pages. Unpin a page to choose another.");
      return;
    }
    const next = pins.includes(path) ? pins.filter((item) => item !== path) : [...pins, path];
    setPreference({ key: storageKey, pins: next });
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* Browser-local preference only. */
    }
  }

  function links(items: NavigationLink[], pinGroup = false) {
    return (
      <SidebarMenu>
        {items
          .filter((link) => link.show)
          .map(({ path, label, Icon }) => (
            <SidebarMenuItem key={path}>
              <SidebarMenuButton
                asChild
                isActive={currentPath === path}
                tooltip={label}
                data-pending={pendingPath === path}
                className={cn(
                  "min-h-11 gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:text-foreground data-[active=true]:font-semibold data-[active=true]:text-teal-ink data-[pending=true]:bg-teal-soft data-[pending=true]:text-teal-ink",
                  PIN_CONTROLS_ENABLED && "pr-12",
                )}
              >
                <Link
                  href={href(path)}
                  aria-current={currentPath === path ? "page" : undefined}
                  aria-busy={pendingPath === path}
                  onNavigate={(event) => {
                    event.preventDefault();
                    navigate(path, label);
                  }}
                >
                  <Icon aria-hidden className="size-[18px]" />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
              {PIN_CONTROLS_ENABLED && (
                <SidebarMenuAction
                  className="top-0 right-0 size-11 text-muted-foreground hover:text-primary"
                  aria-label={`${pins.includes(path) ? "Unpin" : "Pin"} ${label}`}
                  aria-pressed={pins.includes(path)}
                  title={`${pins.includes(path) ? "Unpin" : "Pin"} ${label}`}
                  onClick={() => togglePin(path)}
                  showOnHover={!pinGroup && !pins.includes(path)}
                >
                  {pins.includes(path) ? <PinOff aria-hidden /> : <Pin aria-hidden />}
                </SidebarMenuAction>
              )}
            </SidebarMenuItem>
          ))}
      </SidebarMenu>
    );
  }

  return (
    <>
      {!!pinned.length && (
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="mb-2 px-3 text-xs font-semibold text-muted-foreground">
            Pinned pages
          </SidebarGroupLabel>
          <p className="sr-only">
            Pins are saved only in this browser for your account and clinic.
          </p>
          {links(pinned, true)}
        </SidebarGroup>
      )}
      {groups
        .filter((group) => group.links.some((link) => link.show))
        .map((group) =>
          group.label === "Settings" ? (
            <Collapsible
              key={group.label}
              open={state === "collapsed" || settingsOpen}
              onOpenChange={setSettingsOpen}
              asChild
            >
              <SidebarGroup className="py-1">
                <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-xs font-semibold text-muted-foreground group-data-[collapsible=icon]:hidden hover:bg-muted hover:text-foreground">
                  Settings
                  <ChevronDown
                    aria-hidden
                    className="size-4 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>{links(group.links)}</CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          ) : (
            <SidebarGroup key={group.label} className="py-1">
              <SidebarGroupLabel className="mb-2 px-3 text-xs font-semibold text-muted-foreground">
                {group.label}
              </SidebarGroupLabel>
              {links(group.links)}
            </SidebarGroup>
          ),
        )}
    </>
  );
}
