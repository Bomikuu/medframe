"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { sessionRouteSchema } from "@/lib/auth/session-route";
import { requestWithCsrf, errorMessage } from "@/lib/auth/client";

export function SessionRecovery() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await requestWithCsrf("auth/logout", { clear_device: true });
      // A full navigation drops the rejected workspace's client/router state.
      window.location.replace("/login");
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => window.location.assign("/auth/continue")}
        >
          Open my workspace
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => void signOut()}>
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

export function SessionUnavailable() {
  return (
    <main id="main" className="mx-auto grid max-w-xl gap-5 px-6 py-16">
      <h1 className="text-2xl font-semibold">We couldn’t check your session</h1>
      <p role="status" className="text-sm leading-6 text-muted-foreground">
        Your workspace hasn’t been opened. Retry the session check, or sign out of this browser.
      </p>
      <SessionRecovery />
    </main>
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
  if (state === "checking") return <p role="status">Checking your session…</p>;
  if (state === "failed") return <SessionUnavailable />;
  return children;
}
