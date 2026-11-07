"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  LogOut,
  LayoutDashboard,
  LoaderCircle,
  ShieldCheck,
  ChevronDown,
  RotateCcw,
  WifiOff,
} from "lucide-react";
import { RecoveryState } from "@/components/application/recovery-state";
import { LoadingInformation } from "@/components/application/loading-information";
import { Button } from "@/components/ui/button";
import { sessionRouteSchema } from "@/lib/auth/session-route";
import { requestWithCsrf, errorMessage } from "@/lib/auth/client";

export function SessionRecovery({
  centered = false,
  showWorkspace = true,
}: {
  centered?: boolean;
  showWorkspace?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await requestWithCsrf("auth/logout", { clear_device: true });
      // A full navigation drops the rejected workspace's client/router state.
      window.location.replace(
        window.location.pathname.startsWith("/portal") ? "/portal/login" : "/login",
      );
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }
  return (
    <div className={centered ? "grid gap-4 text-center" : "grid gap-3 border-t border-border pt-4"}>
      <div className={`flex flex-wrap gap-2 ${centered ? "justify-center" : ""}`}>
        {showWorkspace && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => window.location.assign("/auth/continue")}
          >
            <LayoutDashboard aria-hidden="true" />
            Open my workspace
          </Button>
        )}
        <Button type="button" variant="ghost" disabled={busy} onClick={() => void signOut()}>
          {busy ? (
            <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <LogOut aria-hidden="true" />
          )}
          {busy ? "Signing out…" : "Sign out of this browser"}
        </Button>
      </div>
      <p className="max-w-prose text-xs leading-5 text-muted-foreground">
        Signing out also exits device mode in this browser. Your clinic’s device registration is
        kept.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Reset is reserved for blocked/unknown access, never an expired-session call to action. */
export function SessionRecoveryOptions({ showWorkspace = true }: { showWorkspace?: boolean }) {
  return (
    <details className="group border-t border-border pt-5 text-sm">
      <summary className="mx-auto flex w-fit cursor-pointer list-none items-center justify-center gap-2 rounded-md font-medium text-muted-foreground outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        Advanced recovery
        <ChevronDown
          className="size-4 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="mt-5">
        <SessionRecovery centered showWorkspace={showWorkspace} />
      </div>
    </details>
  );
}

export function SessionUnavailable({ embedded = false }: { embedded?: boolean }) {
  const Container = embedded ? "section" : "main";
  return (
    <Container
      id={embedded ? undefined : "main"}
      className={
        embedded ? "grid w-full place-items-center" : "grid min-h-svh place-items-center px-5 py-8"
      }
    >
      <RecoveryState
        compact={embedded}
        level={embedded ? 2 : 1}
        icon={WifiOff}
        title="We couldn’t check your session"
        description="Your workspace hasn’t been opened. Check your connection and retry the session check. If the problem continues, contact your clinic administrator."
      >
        <Button type="button" onClick={() => window.location.reload()}>
          <RotateCcw aria-hidden="true" />
          Retry session check
        </Button>
        <SessionRecoveryOptions />
      </RecoveryState>
    </Container>
  );
}

// Revalidate on mount too: a client navigation can reuse pre-login router content.
export function LoginSessionBoundary({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "ready" | "failed">("checking");
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setState("failed");
      controller.abort();
    }, 8000);
    void fetch("/api/backend/auth/session", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session check unavailable");
        const session = sessionRouteSchema.parse(await response.json());
        if (controller.signal.aborted) return;
        if (session.authenticated) window.location.replace(session.destination);
        else setState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("failed");
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);
  if (state === "checking")
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingInformation
          title="Checking your session"
          detail="Checking whether this browser already has an active session."
          icon={ShieldCheck}
        />
      </div>
    );
  if (state === "failed") return <SessionUnavailable embedded />;
  return children;
}
