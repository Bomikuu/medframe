"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { currency } from "./schema";

export function Money({ value, code = "PHP" }: { value: string; code?: string }) {
  return <span className="whitespace-nowrap tabular-nums">{currency(value, code)}</span>;
}
export function FinancialNotice({ error, message }: { error?: string; message?: string }) {
  return (
    <>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-teal-ink">
          {message}
        </p>
      )}
    </>
  );
}
export function FinancialSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="@container grid min-w-0 gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
export function PageNavigation({
  next,
  after,
  change,
}: {
  next: string | null;
  after: string | null;
  change: (value: string | null) => void;
}) {
  if (!after && !next) return null;
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="outline" disabled={!after} onClick={() => change(null)}>
        Newest records
      </Button>
      <Button type="button" variant="outline" disabled={!next} onClick={() => change(next)}>
        Older records
      </Button>
    </div>
  );
}
