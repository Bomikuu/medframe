"use client";

import { ArrowRight, CreditCard, FlaskConical, Layers3, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Department } from "./types";
import type { StaffTicket } from "./staff-dialogs";

export function DepartmentIcon({ kind }: { kind: string }) {
  const Icon =
    kind === "consultation"
      ? Stethoscope
      : kind === "laboratory"
        ? FlaskConical
        : kind === "cashier"
          ? CreditCard
          : Layers3;
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        kind === "consultation"
          ? "bg-info-soft text-info"
          : kind === "laboratory"
            ? "bg-secondary text-primary"
            : kind === "cashier"
              ? "bg-danger-soft text-destructive"
              : "bg-muted text-muted-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}

export function DepartmentOverview({
  departments,
  tickets,
  onView,
}: {
  departments: Department[];
  tickets: StaffTicket[];
  onView: (department: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {departments.map((department) => {
        const rows = tickets.filter(
          (ticket) => ticket.department_id === department.id && ticket.visit_state === "open",
        );
        const serving = rows.filter((ticket) => ["called", "in_service"].includes(ticket.status));
        const waiting = rows.filter((ticket) => ticket.status === "waiting").length;
        return (
          <article
            key={department.id}
            aria-label={`${department.name} queue summary`}
            className="min-w-0 rounded-xl border border-border p-4"
          >
            <div className="flex items-start gap-3">
              <DepartmentIcon kind={department.kind} />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold break-words">{department.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{department.prefix}</p>
              </div>
            </div>
            <span
              className={cn(
                "mt-3 inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                department.active
                  ? "bg-success-soft text-success"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {department.active ? "Available" : "Unavailable"}
            </span>
            <dl className="mt-3 divide-y divide-border/60 text-xs tabular-nums">
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-muted-foreground">Waiting</dt>
                <dd className="font-semibold">{waiting}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2">
                <dt className="shrink-0 text-muted-foreground">Now serving</dt>
                <dd className="text-right font-semibold break-words">
                  {serving.length ? serving.map((ticket) => ticket.label).join(", ") : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-muted-foreground">Wait estimate</dt>
                <dd className="text-muted-foreground">Unavailable</dd>
              </div>
            </dl>
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full"
              onClick={() => onView(department.id)}
              aria-label={`View ${department.name} queue`}
            >
              View queue <ArrowRight className="size-4" />
            </Button>
          </article>
        );
      })}
    </div>
  );
}

export function DepartmentServices({
  departments,
  canManage,
  onEdit,
}: {
  departments: Department[];
  canManage: boolean;
  onEdit: (department: Department) => void;
}) {
  return (
    <div className="divide-y divide-border/60">
      {departments.map((row) => (
        <div key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-4">
          <DepartmentIcon kind={row.kind} />
          <div className="min-w-0 flex-1 basis-28">
            <h3 className="text-sm font-semibold break-words">{row.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground capitalize">
              {row.prefix} · {row.kind}
            </p>
          </div>
          <div className="min-w-0 flex-1 basis-40">
            <p
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium",
                row.active ? "text-success" : "text-muted-foreground",
              )}
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              {row.active ? "Available" : "Unavailable"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {row.kind === "consultation"
                ? `${row.duration} min · arrive ${row.early_minutes} min before / ${row.late_minutes} min after`
                : "No doctor required"}
            </p>
          </div>
          {canManage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Edit ${row.name}`}
              onClick={() => onEdit(row)}
            >
              Edit
            </Button>
          )}
        </div>
      ))}
      {!departments.length && (
        <p className="py-8 text-sm leading-6 text-muted-foreground">
          No kiosk services are configured for this branch yet.
        </p>
      )}
    </div>
  );
}
