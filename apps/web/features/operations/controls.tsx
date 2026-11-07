"use client";

import { StatusBadge } from "@/components/application/status-badge";
import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { DateInput } from "@/components/application/date-input";

export function OperationNotice({ message, error }: { message: string; error: string }) {
  return (
    <>
      {message && (
        <p role="status" className="text-sm text-primary">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
export function OperationsLiveStatus({
  connected,
  updated,
}: {
  connected: boolean;
  updated?: string;
}) {
  return (
    <p className="max-w-2xl text-xs leading-6 text-muted-foreground" role="status">
      <StatusBadge value={connected ? "live" : "reconnecting"} />{" "}
      <span className="ml-2">
        {connected ? "Live updates connected" : "Checking every 30 seconds"}
      </span>
      {updated ? ` · Updated ${new Date(updated).toLocaleTimeString()}` : ""}. Estimates use
      configured durations and may change.
    </p>
  );
}
/** Temporary manual mode for clinic appointments and queues. */
export function OperationsRefresh({ refresh, busy }: { refresh: () => void; busy: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs text-muted-foreground">Manual updates</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          if (!busy) refresh();
        }}
        aria-disabled={busy}
        aria-busy={busy}
      >
        <RefreshCw aria-hidden className="size-4" />
        {busy ? "Refreshing…" : "Refresh"}
      </Button>
    </div>
  );
}
export function OperationSection({
  title,
  children,
  surface = true,
}: {
  title: string;
  children: ReactNode;
  surface?: boolean;
}) {
  return (
    <section
      data-panel={surface ? "" : undefined}
      className={
        surface
          ? "@container grid min-w-0 gap-5 rounded-xl border border-border bg-card p-4 sm:p-6"
          : "@container grid min-w-0 gap-5"
      }
    >
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
export function DateChoice({
  id,
  value,
  change,
  label = "Date",
}: {
  id: string;
  value: string;
  change: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="max-w-xs">
      <FormField id={id} label={label}>
        <DateInput id={id} value={value} onChange={(event) => change(event.target.value)} />
      </FormField>
    </div>
  );
}
export function EmptyOperations({
  children,
  reload,
}: {
  children: ReactNode;
  reload?: () => void;
}) {
  return (
    <div className="grid gap-3 py-6 text-sm text-muted-foreground">
      <p>{children}</p>
      {reload && (
        <Button type="button" variant="outline" onClick={reload}>
          Try again
        </Button>
      )}
    </div>
  );
}
