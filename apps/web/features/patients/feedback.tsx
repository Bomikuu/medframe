"use client";

import { useEffect } from "react";
import { useSafety } from "@/features/workspace/safety-provider";
import { ClientError } from "graphql-request";
import { Button } from "@/components/ui/button";

export function failureCode(error: unknown): string {
  if (error instanceof ClientError) {
    if (error.response.status === 401) return "UNAUTHENTICATED";
    return String(error.response.errors?.[0]?.extensions?.code ?? "UNAVAILABLE");
  }
  return "UNAVAILABLE";
}

export function failureText(error: unknown) {
  const code = failureCode(error);
  if (code === "CONFLICT")
    return "This record changed since you opened it. Your input is still here. Load the latest version and review it before saving.";
  if (["FORBIDDEN", "NOT_FOUND"].includes(code))
    return "This patient is unavailable or your access has changed. Return to Patients or contact your clinic administrator.";
  if (code === "UNAUTHENTICATED") return "Your session has expired. Sign in again to continue.";
  if (code === "INVALID_INPUT") return "Check your entries and review states, then try again.";
  return "The request could not be completed. Check your connection and try again. Your entered values have been kept.";
}

export function LoadState({ error, retry }: { error: unknown; retry: () => void }) {
  const { clearDirty } = useSafety();
  useEffect(() => {
    if (error && ["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED"].includes(failureCode(error)))
      clearDirty();
  }, [error, clearDirty]);
  return (
    <div className="flex min-h-40 max-w-2xl flex-col items-start justify-center gap-4 rounded-xl border border-border p-6">
      {error ? (
        <>
          <p role="alert" className="text-sm leading-6 text-destructive">
            {failureText(error)}
          </p>
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
          {failureCode(error) === "UNAUTHENTICATED" && (
            <a href="/login" className="text-sm text-primary underline">
              Sign in
            </a>
          )}
        </>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          Loading patient information…
        </p>
      )}
    </div>
  );
}

export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight wrap-anywhere">{title}</h1>
        {description && (
          <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export function dateLabel(date: string | null | undefined) {
  if (!date) return "Not recorded";
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(
      `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00.000Z`,
    ),
  );
}

export function timeLabel(value: string) {
  return (
    new Intl.DateTimeFormat("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Manila",
    }).format(new Date(value)) + " (Asia/Manila)"
  );
}

export function RemoteNotice({ error, retry }: { error: unknown; retry: () => void }) {
  if (!error) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted p-4">
      <p role="status" className="max-w-prose text-sm leading-6">
        Connection interrupted. Previously loaded information and unsaved changes are still here.
        Reconnect and retry before continuing.
      </p>
      <Button type="button" variant="outline" onClick={retry}>
        Retry connection
      </Button>
    </div>
  );
}
