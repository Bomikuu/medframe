"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { errorMessage, requestWithCsrf } from "@/lib/auth/client";

export type GoogleConfiguration =
  { enabled: false } | { enabled: true; clientId: string; nonce: string };
type GoogleIdentityApi = {
  initialize: (options: {
    client_id: string;
    nonce: string;
    auto_select: boolean;
    callback: (response: { credential: string }) => void;
  }) => void;
  renderButton: (
    container: HTMLElement,
    options: { type: string; theme: string; size: string; text: string; width: number },
  ) => void;
};

export function GoogleSignIn({
  portal,
  busy,
  remember,
  onSubmit,
  prepare,
  signup = false,
  description,
}: {
  portal: boolean;
  prepare?: () => Promise<GoogleConfiguration>;
  signup?: boolean;
  description?: string;
  busy: boolean;
  remember: boolean;
  onSubmit: (credential: string, remember: boolean) => Promise<void>;
}) {
  const [configuration, setConfiguration] = useState<GoogleConfiguration | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef({ onSubmit, remember, busy });

  useEffect(() => {
    latest.current = { onSubmit, remember, busy };
  }, [onSubmit, remember, busy]);

  useEffect(() => {
    let active = true;
    (prepare
      ? prepare()
      : requestWithCsrf<GoogleConfiguration>(
          `${portal ? "portal/auth" : "auth"}/google/prepare`,
          {},
        )
    )
      .then((result) => {
        if (active) setConfiguration(result);
      })
      .catch((failure: unknown) => {
        if (active) setError(errorMessage(failure));
      });
    return () => {
      active = false;
    };
  }, [portal, prepare]);

  useEffect(() => {
    if (!configuration?.enabled || !scriptReady || !container.current) return;
    const google = (window as Window & { google?: { accounts: { id: GoogleIdentityApi } } }).google
      ?.accounts.id;
    if (!google) return;
    const host = container.current;
    google.initialize({
      client_id: configuration.clientId,
      nonce: configuration.nonce,
      auto_select: false,
      callback: ({ credential }) => {
        if (!latest.current.busy) {
          void latest.current.onSubmit(credential, latest.current.remember);
        }
      },
    });
    google.renderButton(host, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: signup ? "signup_with" : "continue_with",
      width: Math.min(host.clientWidth, 400),
    });
    return () => {
      host.replaceChildren();
    };
  }, [configuration, scriptReady, signup]);

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      {configuration?.enabled && !error ? (
        <>
          <Script
            src="https://accounts.google.com/gsi/client"
            onReady={() => setScriptReady(true)}
            onError={() =>
              setError(
                signup
                  ? "Google could not load. Use email or reload to retry."
                  : "Google could not load. Use your password or reload to retry.",
              )
            }
          />
          <div
            aria-label={signup ? "Sign up with Google" : "Continue with Google"}
            inert={busy}
            className="min-h-10 w-full overflow-hidden rounded-lg"
          >
            {!scriptReady && (
              <p role="status" className="py-2 text-center text-sm text-muted-foreground">
                Loading Google sign-in…
              </p>
            )}
            <div ref={container} className="w-full" />
          </div>
          {description && <p className="text-xs leading-5 text-muted-foreground">{description}</p>}
        </>
      ) : (
        <>
          <Button type="button" variant="outline" disabled aria-describedby="google-status">
            {signup ? "Sign up with Google" : "Continue with Google"}
          </Button>
          <p id="google-status" role="status" className="text-xs leading-5 text-muted-foreground">
            {error ||
              (configuration
                ? signup
                  ? "Google sign-up is not configured yet. Continue with email."
                  : "Google sign-in is not configured yet. Use your email and password."
                : "Checking Google sign-in availability…")}
          </p>
          {error && (
            <Button type="button" variant="ghost" onClick={() => window.location.reload()}>
              Reload Google sign-in
            </Button>
          )}
        </>
      )}
    </div>
  );
}
