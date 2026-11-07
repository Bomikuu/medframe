"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety } from "@/features/workspace/safety-provider";
import { cn } from "@/lib/utils";
import { settingsGroups } from "./settings-catalog";

export function SettingsNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { can, href } = useWorkspace();
  const { guard } = useSafety();
  const [pending, startTransition] = useTransition();
  const groups = settingsGroups
    .map((group) => ({
      ...group,
      tabs: group.tabs.filter((tab) => !tab.permission || can(tab.permission)),
    }))
    .filter((group) => group.tabs.length);
  const active = groups.find((group) => group.tabs.some((tab) => tab.path === pathname));

  function navigate(path: string) {
    if (path === pathname) return;
    void guard(() => startTransition(() => router.push(href(path))));
  }

  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid min-w-0 gap-4">
        {active && (
          <nav
            aria-label={`${active.label} tabs`}
            className="flex min-w-0 gap-1 overflow-x-auto border-b border-border"
          >
            {active.tabs.map((tab) => (
              <Link
                key={tab.id}
                href={href(tab.path)}
                prefetch={false}
                aria-current={pathname === tab.path ? "page" : undefined}
                onNavigate={(event) => {
                  event.preventDefault();
                  navigate(tab.path);
                }}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium outline-offset-[-3px] focus-visible:outline-2 focus-visible:outline-ring",
                  pathname === tab.path
                    ? "border-teal-ink text-teal-ink"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon aria-hidden className="size-4" />
                {tab.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <div className="min-w-0" aria-busy={pending}>
        {children}
      </div>
    </div>
  );
}
