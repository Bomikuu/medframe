"use client";

import { useEffect, useState } from "react";
import { MonitorCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { errorMessage, requestWithCsrf } from "@/lib/auth/client";

type BrowserState = { remembered: boolean; expires_at: string | null; sign_in_again?: boolean };

export function BrowserMemory() {
  const [state, setState] = useState<BrowserState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [forgotten, setForgotten] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    requestWithCsrf<BrowserState>(
      "auth/browser",
      { action: "status" },
      { signal: controller.signal },
    )
      .then((result) => {
        if (live) setState(result);
      })
      .catch(() => {
        /* Optional browser status must never block sign-in. */
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, []);
  if (!state?.remembered && !forgotten) return null;
  async function forget() {
    setBusy(true);
    setError("");
    try {
      const result = await requestWithCsrf<BrowserState>("auth/browser", { action: "forget" });
      setState(result);
      setForgotten(true);
      setOpen(false);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="border-t border-border pt-5 text-sm">
      {forgotten ? (
        <p role="status" className="leading-6 text-muted-foreground">
          Browser forgotten. The next sign-in will follow your clinic’s current verification
          requirement.
          {state?.sign_in_again && (
            <>
              {" "}
              Your current session has ended.{" "}
              <a className="font-medium text-primary underline" href="/login">
                Sign in again
              </a>
              .
            </>
          )}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 font-medium">
            <MonitorCheck className="size-4 text-primary" aria-hidden="true" />
            This browser is remembered
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Until{" "}
            {state?.expires_at
              ? new Intl.DateTimeFormat("en-PH", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "Asia/Manila",
                }).format(new Date(state.expires_at))
              : "its verification expires"}
            . Your password is still required.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              setError("");
              setOpen(true);
            }}
          >
            <RotateCcw className="size-3.5" />
            Forget this browser
          </Button>
        </>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogTitle className="pr-8 text-lg leading-7 font-semibold">
            Forget this browser?
          </DialogTitle>
          <DialogDescription>
            This removes its remembered verification. Your password and authenticator setup stay the
            same. A session using remembered verification will end.
          </DialogDescription>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setOpen(false)} autoFocus>
              Keep remembered
            </Button>
            <Button disabled={busy} onClick={() => void forget()} aria-busy={busy}>
              {busy ? "Forgetting…" : "Forget browser"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
