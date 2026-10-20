"use client";

import { useEffect, useState } from "react";
import { MonitorSmartphone, ShieldCheck, ArrowRight, Clock3 } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { errorMessage } from "@/lib/auth/client";
import { StationCode } from "./code-input";
import { modeLabels, stationRequest, type StationContext } from "./client";
import { SessionRecovery } from "@/features/auth/session-recovery";
import { AccessCodeForm } from "./access-code-form";

export function StationEntry() {
  const [context, setContext] = useState<StationContext | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const result = await stationRequest<StationContext>("context");
        if (active) {
          setContext(result);
          setError("");
        }
      } catch (cause) {
        if (active) setError(errorMessage(cause));
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  async function pair() {
    setBusy(true);
    setError("");
    try {
      await stationRequest("pair", { code });
      setCode("");
      setContext(await stationRequest<StationContext>("context"));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  const device = context?.device;
  return (
    <main id="main" className="min-h-dvh bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-5 py-5 sm:px-10">
        <Brand />
        <span className="text-sm font-medium text-muted-foreground">Station</span>
      </header>
      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 md:grid-cols-[1fr_1.1fr] md:gap-16 md:py-24">
        <section className="self-center">
          <MonitorSmartphone className="mb-6 size-10 text-primary" strokeWidth={1.4} />
          <h1 className="max-w-md text-3xl leading-tight font-semibold sm:text-4xl">
            The right workspace.
            <br />
            On this device.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
            Connect a clinic tablet, kiosk or display. Your clinic chooses what it can do. A
            doctor’s temporary code opens their clinical workspace here.
          </p>
          <div className="mt-8 flex items-start gap-3 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-teal-ink" />
            <p className="max-w-sm leading-6">
              Pairing never grants access to a patient record. Clinic approval and the appropriate
              identity are always required.
            </p>
          </div>
        </section>
        <section
          className="rounded-2xl border border-border bg-card p-6 sm:p-8"
          aria-label="Connect this device"
        >
          <div className="mb-6">
            <SessionRecovery />
          </div>
          {device && !context?.error && device.state === "active" ? (
            <div className="grid gap-5">
              <ShieldCheck className="size-8 text-teal-ink" />
              <div>
                <h2 className="text-2xl font-semibold">{device.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {device.branch} · {modeLabels[device.mode]}
                </p>
              </div>
              {device.mode === "clinician" ? (
                context.access ? (
                  <ButtonLink
                    href={
                      context.access.kind === "doctor"
                        ? `/station/clinician?organization=${context.access.organization_id}`
                        : `/station/clinician/consultations/${context.access.encounter_id}?organization=${context.access.organization_id}`
                    }
                  >
                    {context.access.kind === "doctor"
                      ? "Open doctor workspace"
                      : "Resume assigned consultation"}{" "}
                    <ArrowRight />
                  </ButtonLink>
                ) : (
                  <AccessCodeForm />
                )
              ) : device.mode === "kiosk" ? (
                <ButtonLink href="/station/kiosk">
                  Open patient kiosk <ArrowRight />
                </ButtonLink>
              ) : (
                <ButtonLink href="/station/display">
                  Open queue display <ArrowRight />
                </ButtonLink>
              )}
            </div>
          ) : device?.state === "pending" &&
            !context?.paired &&
            !context?.error?.includes("revoked") ? (
            <div className="grid gap-5">
              <Clock3 className="size-8 text-primary" />
              <h2 className="text-2xl font-semibold">Waiting for clinic approval</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Ask staff to approve <strong className="text-foreground">{device.name}</strong>.
                Compare this verification phrase on both screens.
              </p>
              <p className="rounded-lg bg-muted p-5 text-center text-2xl font-semibold tracking-widest select-all">
                {device.verification_phrase}
              </p>
              <p className="text-sm text-muted-foreground">
                Keep this page open. Status updates automatically.
              </p>
            </div>
          ) : (
            <form
              className="grid gap-6"
              onSubmit={(event) => {
                event.preventDefault();
                void pair();
              }}
            >
              <div>
                <h2 className="text-2xl font-semibold">Connect this device</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Ask authorized clinic staff for a pairing code from Devices & Stations. Codes last
                  five minutes.
                </p>
              </div>
              <div className="grid gap-3">
                <label className="text-sm font-medium">Eight-character pairing code</label>
                <StationCode value={code} onChange={setCode} disabled={busy} />
              </div>
              {context?.error && (
                <p role="status" className="text-sm text-muted-foreground">
                  {context.error}
                </p>
              )}
              <Button type="submit" className="min-h-12" disabled={busy || code.length !== 8}>
                {busy ? "Connecting…" : "Connect device"}
                <ArrowRight />
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                Need help? Ask your clinic’s reception team. Pairing codes and patient verification
                codes are different.
              </p>
            </form>
          )}
          {error && (
            <p role="alert" className="mt-5 text-sm text-destructive">
              {error}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
