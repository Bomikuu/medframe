"use client";

import { RecoveryState } from "@/components/application/recovery-state";
import { PageHeader } from "@/components/application/page-header";
import { useEffect } from "react";
import { useSafety } from "@/features/workspace/safety-provider";
import { requestFailureCode } from "@/lib/auth/request-failure";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { SessionRecoveryOptions } from "@/features/auth/session-recovery";
import {
  AlertCircle,
  LogIn,
  RotateCcw,
  ShieldAlert,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FlaskConical,
  Monitor,
  Users,
} from "lucide-react";
import { LoadingInformation } from "@/components/application/loading-information";
export { dateLabel } from "./calendar-date";

export function failureCode(error: unknown): string {
  return requestFailureCode(error);
}

export function failureText(error: unknown) {
  const code = failureCode(error);
  if (["INVALID_CSRF", "INVALID_ORIGIN", "REQUEST_REJECTED"].includes(code))
    return "This page request could not be validated. Retry to check the secure connection. If it continues, contact your clinic administrator. This does not mean your patient access was removed.";
  if (code === "SECURITY_CHECK_UNAVAILABLE")
    return "We couldn’t complete the secure connection check. Check your connection, then retry. Your account has not been signed out by this message.";
  if (code === "RATE_LIMITED")
    return "Too many requests were received. Wait a moment before retrying; repeated clicks may extend the delay.";
  if (code === "INVALID_RESPONSE")
    return "The service returned incomplete information. Retry to retrieve it again, or contact your clinic administrator if this continues.";
  if (code === "UNSAFE_DOCUMENT")
    return "An attached file has not passed its security scan. Wait for a clean result or explicitly remove it from the draft before finalizing.";
  if (code === "IMMUTABLE")
    return "This consultation is preserved. Reopen a completed draft or create an amendment to change finalized care.";
  if (code === "EVIDENCE_REQUIRED")
    return "Complete the matching procedure in a finalized consultation before completing this plan item.";
  if (code === "CONFLICT")
    return "This record changed since you opened it. Review your entries against the latest version before saving.";
  if (["FORBIDDEN", "NOT_FOUND"].includes(code))
    return "This record is unavailable or your access has changed. Contact your clinic administrator to check your access.";
  if (code === "STATION_REQUIRED")
    return "This staff membership works only on an approved Station. Open Station on a device approved by your clinic.";
  if (code === "UNAUTHENTICATED") return "Your session has expired. Sign in again to continue.";
  if (code === "INVALID_INPUT") return "Check your entries and review states, then try again.";
  return "The request could not be completed. Check your connection and try again. Check the form’s save status before leaving this page.";
}

export function LoadState({
  error,
  retry,
  title,
  detail,
}: {
  error: unknown;
  retry: () => void;
  title?: string;
  detail?: string;
}) {
  const { clearDirty } = useSafety();
  const pathname = usePathname();
  const station = pathname.startsWith("/station");
  useEffect(() => {
    if (error && ["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED"].includes(failureCode(error)))
      clearDirty();
  }, [error, clearDirty]);
  const loadingContext = pathname.includes("diagnostic")
    ? { title: "Loading diagnostic requests", icon: FlaskConical }
    : pathname.startsWith("/clinic/settings/stations")
      ? { title: "Loading clinic devices", icon: Monitor }
      : pathname.startsWith("/clinic/stations")
        ? { title: "Loading patient stations and departments", icon: Users }
        : pathname.startsWith("/station")
          ? { title: "Opening your Station workspace", icon: Monitor }
          : pathname.includes("patient")
            ? { title: "Loading patient records", icon: Users }
            : pathname.includes("consultation")
              ? { title: "Loading consultations", icon: ClipboardList }
              : pathname.includes("appointment") || pathname.includes("queue")
                ? { title: "Loading appointments and queues", icon: CalendarDays }
                : pathname.includes("billing")
                  ? { title: "Loading billing information", icon: CreditCard }
                  : { title: "Loading your workspace", icon: Building2 };
  if (!error)
    return (
      <div className="flex min-h-[min(65svh,32rem)] w-full items-center justify-center px-6 py-10">
        <LoadingInformation
          title={title ?? loadingContext.title}
          icon={loadingContext.icon}
          detail={detail}
          retry={retry}
        />
      </div>
    );
  const code = failureCode(error);
  const expired = code === "UNAUTHENTICATED";
  const stationRequired = code === "STATION_REQUIRED";
  const portal = pathname.startsWith("/portal");
  const restricted = ["FORBIDDEN", "NOT_FOUND"].includes(code);
  const signIn = station ? "/station" : portal ? "/portal/login" : "/login";
  return (
    <RecoveryState
      title={
        expired
          ? "Your session has expired"
          : restricted
            ? "This record is unavailable"
            : ((
                {
                  STATION_REQUIRED: "Use an approved Station",
                  CONFLICT: "This record has changed",
                  IMMUTABLE: "This record is finalized",
                  UNSAFE_DOCUMENT: "Document review is needed",
                  EVIDENCE_REQUIRED: "Clinical evidence is required",
                  INVALID_INPUT: "Review your information",
                  INVALID_CSRF: "We couldn’t validate this request",
                  INVALID_ORIGIN: "We couldn’t validate this request",
                  REQUEST_REJECTED: "This page request was blocked",
                  SECURITY_CHECK_UNAVAILABLE: "Secure connection check unavailable",
                  RATE_LIMITED: "Please wait before trying again",
                  INVALID_RESPONSE: "This information couldn’t be read",
                } as Record<string, string>
              )[code] ?? "We couldn’t open this page")
      }
      description={
        expired
          ? station
            ? "This Station session has ended. Open Station and enter a new code from your clinician to continue."
            : `Sign in again to continue to your ${portal ? "patient portal" : "clinic workspace"}.`
          : failureText(error)
      }
      icon={expired || restricted ? ShieldAlert : AlertCircle}
    >
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        {(expired || stationRequired) && (
          <Button asChild>
            <a href={stationRequired ? "/station" : signIn}>
              <LogIn aria-hidden="true" />
              {station || stationRequired ? "Open Station" : "Sign in again"}
            </a>
          </Button>
        )}
        {!expired && !stationRequired && (
          <Button type="button" onClick={retry}>
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
        )}
      </div>
      {restricted && <SessionRecoveryOptions />}
    </RecoveryState>
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
        Connection interrupted. The information shown may be out of date. Reconnect and retry before
        continuing; check your form’s save status before leaving.
      </p>
      <Button type="button" variant="outline" onClick={retry}>
        Retry connection
      </Button>
    </div>
  );
}
