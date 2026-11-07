"use client";

import { useId, type ReactNode } from "react";
import { ShieldAlert, type LucideIcon } from "lucide-react";

/** Shared recovery presentation; callers retain their native recovery actions. */
export function RecoveryState({
  title,
  description,
  icon: Icon = ShieldAlert,
  children,
  compact = false,
  level = 2,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  children?: ReactNode;
  compact?: boolean;
  level?: 1 | 2;
}) {
  const heading = useId();
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div
      className={`flex w-full items-center justify-center ${compact ? "min-h-56" : "min-h-[min(70svh,36rem)]"}`}
    >
      <section
        aria-labelledby={heading}
        className={`w-full max-w-lg px-6 py-9 text-center sm:px-9 sm:py-10 ${compact ? "" : "rounded-2xl border border-border bg-card"}`}
      >
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Icon className="size-8" strokeWidth={1.6} aria-hidden="true" />
        </div>
        <div role="alert" aria-atomic="true">
          <Heading
            id={heading}
            className="text-2xl leading-tight font-semibold tracking-tight text-foreground"
          >
            {title}
          </Heading>
          <p className="mx-auto mt-3 max-w-prose text-sm leading-7 text-muted-foreground">
            {description}
          </p>
        </div>
        {children && <div className="mt-7 space-y-4">{children}</div>}
      </section>
    </div>
  );
}
