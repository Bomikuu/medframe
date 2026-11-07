"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  ArrowRight,
  Clock3,
  HelpCircle,
  MonitorSmartphone,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { errorMessage } from "@/lib/auth/client";
import { StationCode } from "./code-input";
import { modeLabels, stationRequest, type StationContext } from "./client";
import { SessionRecoveryOptions } from "@/features/auth/session-recovery";
import { AccessCodeForm } from "./access-code-form";
import { StationEntryLayout } from "./station-entry-layout";

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
    <StationEntryLayout>
      <div className="mb-7 [&>details]:border-t-0 [&>details]:pt-0">
        <SessionRecoveryOptions />
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
            ) : context.staff_workspace ? (
              <div className="grid gap-3">
                <ButtonLink href={`/station/clinician?organization=${device.organization_id}`}>
                  Open clinical workspace <ArrowRight />
                </ButtonLink>
                <p className="text-sm leading-6 text-muted-foreground">
                  Continue with your signed-in staff account. Your clinic workspace stays available.
                </p>
              </div>
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
            Ask staff to approve <strong className="text-foreground">{device.name}</strong>. Compare
            this verification phrase on both screens.
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
          className="grid gap-7"
          aria-busy={busy}
          onSubmit={(event) => {
            event.preventDefault();
            void pair();
          }}
        >
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-sky-50 text-primary sm:size-16 dark:bg-secondary">
              <MonitorSmartphone
                className="size-7 sm:size-8"
                strokeWidth={1.6}
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-primary sm:text-2xl lg:text-[1.75rem]">
                Connect this device
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Ask authorized clinic staff for a pairing code from Devices & Stations. Codes last
                five minutes.
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            <label htmlFor="station-pairing-code" className="text-sm font-semibold">
              Eight-character pairing code
            </label>
            <StationCode
              id="station-pairing-code"
              size="large"
              value={code}
              onChange={setCode}
              disabled={busy}
            />
          </div>
          {context?.error && (
            <p role="status" className="text-sm text-muted-foreground">
              {context.error}
            </p>
          )}
          <Button
            type="submit"
            className="h-12 w-full text-sm active:scale-[0.99] motion-reduce:transform-none sm:h-14"
            disabled={busy || code.length !== 8}
          >
            {busy ? "Connecting…" : "Connect device"}
            {busy ? (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <ArrowRight aria-hidden="true" />
            )}
          </Button>
          <div className="flex items-start gap-3 border-t border-border pt-5 text-xs leading-6 text-muted-foreground">
            <HelpCircle className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <p>
              Need help? Ask your clinic’s reception team. Pairing codes and patient verification
              codes are different.
            </p>
          </div>
        </form>
      )}
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm leading-6 text-destructive"
        >
          {error}
        </p>
      )}
    </StationEntryLayout>
  );
}
