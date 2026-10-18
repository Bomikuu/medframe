"use client";

import type { ReactNode } from "react";
import { FormSelect } from "@/features/patients/form-controls";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import type { OperationsSetup } from "./schema";

export function BranchChoice({
  setup,
  change,
}: {
  setup: OperationsSetup;
  change: (id: string) => void;
}) {
  return (
    <div className="max-w-sm">
      <FormSelect
        id="operations-branch"
        label="Clinic branch"
        value={setup.branch_id}
        onChange={change}
        options={setup.branches.map((row) => ({ value: row.id, label: row.name }))}
      />
    </div>
  );
}
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
    <p className="text-sm text-muted-foreground" role="status">
      {connected
        ? "Live updates connected"
        : "Live updates disconnected; checking every 30 seconds"}
      {updated ? ` · Updated ${new Date(updated).toLocaleTimeString()}` : ""}. Estimates use
      configured durations and may change.
    </p>
  );
}
export function OperationSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid min-w-0 gap-5 border-t border-border pt-7">
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
        <Input id={id} type="date" value={value} onChange={(event) => change(event.target.value)} />
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
