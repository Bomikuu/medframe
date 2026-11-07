"use client";

import { Brand } from "@/components/brand";
import { MedframeScene } from "@/components/illustrations/medframe-scene";
import { useState } from "react";
import {
  ArrowRight,
  LogIn,
  ShieldCheck,
  ChevronDown,
  Video,
  Info,
  LoaderCircle,
} from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AppointmentScheduleSummary, AppointmentRescheduleLink } from "./appointment-room-schedule";
import { RoomEntryHero } from "./room-entry-hero";
import type { CallState } from "./client";

export function RoomEntry({
  state,
  busy,
  error,
  join,
}: {
  state: CallState;
  busy: boolean;
  error: string;
  join: (doctor: boolean, pin?: string) => Promise<void>;
}) {
  const [pin, setPin] = useState("");
  return (
    <main id="main" className="grid min-h-svh bg-card lg:grid-cols-2 xl:grid-cols-[1.08fr_1fr]">
      <RoomEntryHero />
      <section className="flex min-w-0 flex-col justify-center px-4 py-6 sm:px-8 sm:py-8 lg:px-9 xl:px-12 2xl:px-16">
        <div className="mx-auto grid w-full max-w-[520px] gap-5">
          <Brand className="mb-1 lg:hidden" />
          <header>
            <h1 className="text-[clamp(1.5rem,2.3vw,2rem)] leading-tight font-semibold tracking-tight">
              Enter your appointment code
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use the six-digit PIN provided by your clinic to join your appointment.
            </p>
          </header>
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            {state.timing_mode === "instant" ? (
              <section aria-label="Instant consultation" className="flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-teal-soft text-teal-ink">
                  <Video aria-hidden className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-primary">Instant consultation</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Join whenever your doctor is ready. No scheduled entry window.
                  </p>
                </div>
              </section>
            ) : (
              <AppointmentScheduleSummary start={state.start} timezone={state.timezone} />
            )}
            <form
              noValidate
              className="mt-5 grid gap-4 border-t border-border pt-5"
              onSubmit={(event) => {
                event.preventDefault();
                void join(false, pin);
              }}
            >
              <label htmlFor="appointment-pin" className="text-sm font-medium">
                Appointment PIN
              </label>
              <InputOTP
                id="appointment-pin"
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                inputMode="numeric"
                value={pin}
                onChange={setPin}
                disabled={busy}
                autoComplete="one-time-code"
                aria-invalid={!!error}
                aria-describedby={error ? "appointment-pin-error" : undefined}
                containerClassName="w-full"
              >
                <InputOTPGroup className="grid w-full grid-cols-6 gap-2 rounded-none sm:gap-3">
                  {Array.from({ length: 6 }, (_, index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="h-11 w-full min-w-0 rounded-lg border! text-lg font-medium first:rounded-lg last:rounded-lg sm:h-12"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {error && (
                <p
                  id="appointment-pin-error"
                  role="alert"
                  className="rounded-lg bg-destructive/5 p-3 text-sm leading-6 text-destructive"
                >
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="mt-1 h-12 w-full justify-between px-5"
                disabled={busy || pin.length !== 6}
                aria-busy={busy}
              >
                <span className="flex-1">{busy ? "Checking access…" : "Join appointment"}</span>
                {busy ? (
                  <LoaderCircle
                    aria-hidden
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <ArrowRight aria-hidden className="size-4" />
                )}
              </Button>
            </form>
            {state.timing_mode !== "instant" && (
              <div className="mt-6 border-t border-border pt-5">
                <AppointmentRescheduleLink roomId={state.id} />
              </div>
            )}
          </div>
          {(state.connection?.profile === "loopback" || !state.media_ready) && (
            <div
              className="flex items-start gap-3 rounded-lg bg-warning-soft p-3 text-xs leading-5 text-warning"
              role="status"
            >
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              <div className="grid gap-1.5">
                {state.connection?.profile === "loopback" && (
                  <p>
                    This room uses the local-only media setup. Internet calls are not active yet.
                  </p>
                )}
                {!state.media_ready && (
                  <p>
                    The local call service is unavailable. Contact your clinic or try again shortly.
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span aria-hidden className="h-px flex-1 bg-border" />
            Or
            <span aria-hidden className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-3">
            {state.can_join_doctor ? (
              <Button
                variant="outline"
                className="h-12 w-full"
                disabled={busy}
                onClick={() => void join(true)}
              >
                <LogIn aria-hidden className="size-4" />
                Join with my doctor account
              </Button>
            ) : state.staff_signed_in ? (
              <p className="rounded-lg bg-muted p-4 text-sm leading-6 text-muted-foreground">
                Your signed-in account is not eligible to join this room as doctor. Contact your
                clinic administrator for assignment or patient access.
              </p>
            ) : (
              <ButtonLink variant="outline" className="h-12 w-full" href="/login">
                <LogIn aria-hidden className="size-4" />
                Join with my doctor account
              </ButtonLink>
            )}
          </div>
          <details className="group text-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded py-1 text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
              Help joining your appointment
              <ChevronDown
                aria-hidden
                className="size-4 transition-transform group-open:rotate-180"
              />
            </summary>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-5 text-muted-foreground">
              <li>
                Enter the latest PIN from your clinic, then check your camera and microphone in the
                room.
              </li>
              <li>
                Allow browser access when you choose Check devices or Join call. You can also use
                audio only.
              </li>
              <li>
                Wait for your doctor to admit you and start the appointment. If the PIN is rejected
                or the appointment has ended, contact your clinic.
              </li>
            </ol>
          </details>
          <p className="flex items-start justify-center gap-2 text-center text-[11px] leading-5 text-muted-foreground">
            <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {state.timing_mode === "instant"
                ? "Your doctor admits you and closes this room when the consultation ends."
                : "Access ends at the appointment’s end time unless your doctor extends it."}
            </span>
          </p>
          <MedframeScene name="online-waiting-room" className="mt-2 max-w-64 lg:hidden" />
        </div>
      </section>
    </main>
  );
}
