"use client";

import { PageHeader } from "@/components/application/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { useSafety } from "@/features/workspace/safety-provider";
import { ClientError } from "graphql-request";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function failureCode(error: unknown): string {
  if (error instanceof ClientError) {
    if (error.response.status === 403) return "FORBIDDEN";
    if (error.response.status === 401) return "UNAUTHENTICATED";
    return String(error.response.errors?.[0]?.extensions?.code ?? "UNAVAILABLE");
  }
  return "UNAVAILABLE";
}

export function failureText(error: unknown) {
  const code = failureCode(error);
  if (code === "UNSAFE_DOCUMENT")
    return "An attached file has not passed its security scan. Wait for a clean result or explicitly remove it from the draft before finalizing.";
  if (code === "IMMUTABLE")
    return "This consultation is preserved. Reopen a completed draft or create an amendment to change finalized care.";
  if (code === "EVIDENCE_REQUIRED")
    return "Complete the matching procedure in a finalized consultation before completing this plan item.";
  if (code === "CONFLICT")
    return "This record changed since you opened it. Your input is still here. Load the latest version and review it before saving.";
  if (["FORBIDDEN", "NOT_FOUND"].includes(code))
    return "This record is unavailable or your access has changed. Return to the collection or contact your clinic administrator.";
  if (code === "UNAUTHENTICATED") return "Your session has expired. Sign in again to continue.";
  if (code === "INVALID_INPUT") return "Check your entries and review states, then try again.";
  return "The request could not be completed. Check your connection and try again. Your entered values have been kept.";
}

export function LoadState({ error, retry }: { error: unknown; retry: () => void }) {
  const { clearDirty } = useSafety();
  const pathname = usePathname();
  const router = useRouter();
  const station = pathname.startsWith("/station");
  function returnToCollection() {
    const params = new URLSearchParams(window.location.search);
    const context = new URLSearchParams();
    const key = pathname.startsWith("/portal") ? "link" : "organization";
    const value = params.get(key);
    if (value) context.set(key, value);
    const collection = station
      ? "/station/clinician"
      : pathname.startsWith("/portal")
        ? "/portal"
        : pathname.startsWith("/clinic/settings") || !pathname.startsWith("/clinic/")
          ? "/clinic"
          : pathname.split("/").slice(0, 3).join("/");
    router.replace(`${collection || "/clinic"}${context.size ? `?${context}` : ""}`);
  }
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
          <Button type="button" variant="ghost" onClick={returnToCollection}>
            <ArrowLeft /> {station ? "Back to Station" : "Back to collection"}
          </Button>
          {failureCode(error) === "UNAUTHENTICATED" && (
            <a href="/login" className="text-sm text-primary underline">
              Sign in
            </a>
          )}
        </>
      ) : (
        <div role="status" className="grid w-full gap-4">
          <span className="sr-only">Loading workspace information…</span>
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
    </div>
  );
}

export function PageHeading({
  title,
  description,
  children,
  level = 1,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  level?: 1 | 2;
}) {
  return <PageHeader title={title} description={description} actions={children} level={level} />;
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
