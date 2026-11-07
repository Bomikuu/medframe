"use client";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
export type ActionChoice = {
  id: string;
  label: string;
  description: string;
  group: string;
  icon: LucideIcon;
  tone?: "care" | "finance" | "record";
  href?: string;
};
export function PatientActionGrid<T extends ActionChoice>({
  actions,
  search,
  choose,
  suggested = [],
  contextual = false,
  groupOrder = ["Clinical care", "Visits & payments", "Patient record"],
}: {
  actions: T[];
  search: string;
  choose: (action: T) => void;
  suggested?: string[];
  contextual?: boolean;
  groupOrder?: string[];
}) {
  const quick = !search.trim()
    ? suggested.flatMap((id) => actions.filter((action) => action.id === id)).slice(0, 3)
    : [];
  const renderAction = (action: T, featured = false) => (
    <button
      key={action.id}
      type="button"
      onClick={() => choose(action)}
      className={cn(
        "group flex min-h-24 items-start gap-3 rounded-xl border border-border p-4 text-left outline-offset-4 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring",
        featured && "border-teal-ink/25 bg-teal-soft/40",
        action.id === "consultation" &&
          "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          action.id === "consultation"
            ? "bg-primary-foreground/10"
            : action.tone === "finance"
              ? "bg-warning-soft text-warning"
              : action.tone === "care"
                ? "bg-teal-soft text-teal-ink"
                : "bg-info-soft text-info",
        )}
      >
        <action.icon aria-hidden className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2 text-sm font-semibold">
          {action.label}
          {action.href && <ArrowUpRight aria-hidden className="mt-0.5 size-3.5 shrink-0" />}
        </span>
        <span
          className={cn(
            "mt-1 block text-xs leading-5",
            action.id === "consultation" ? "text-primary-foreground/85" : "text-muted-foreground",
          )}
        >
          {action.description}
        </span>
      </span>
    </button>
  );
  return (
    <div className="grid gap-5">
      {!!quick.length && (
        <section className="grid gap-3" aria-label="Quick patient actions">
          <div>
            <h2 className="text-sm font-semibold">
              {contextual ? "For this patient" : "Common actions"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {contextual
                ? "Shortcuts based on available saved visits and balances."
                : "Start here, or browse all available actions below."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quick.map((action) => renderAction(action, true))}
          </div>
        </section>
      )}
      {groupOrder.map((group) => {
        const items = actions.filter(
          (action) =>
            !quick.some((item) => item.id === action.id) &&
            action.group === group &&
            `${action.label} ${action.description}`
              .toLowerCase()
              .includes(search.toLowerCase().trim()),
        );
        if (!items.length) return null;
        return (
          <section key={group} className="grid gap-3">
            <h2 className="text-sm font-semibold">{group}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((action) => renderAction(action))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
