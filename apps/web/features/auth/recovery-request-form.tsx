"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowUpRight,
  KeyRound,
  LoaderCircle,
  Mail,
  MailCheck,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { ApiError, errorMessage, requestWithCsrf } from "@/lib/auth/client";
import { normalizeEmail } from "@/lib/contact-format";

const emailSchema = z.object({ email: z.email("Enter a valid email address.").max(254) });
type Values = z.infer<typeof emailSchema>;

export function RecoveryRequestForm({
  portal = false,
  localInboxUrl,
}: {
  portal?: boolean;
  localInboxUrl?: string;
}) {
  const [sentTo, setSentTo] = useState("");
  const [lastEmail, setLastEmail] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const confirmation = useRef<HTMLHeadingElement>(null);
  const form = useForm<Values>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const email = normalizeEmail(form.watch("email"));
  const cooldown = email === lastEmail ? remaining : 0;

  useEffect(() => {
    if (!remaining) return;
    const timer = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  async function send(values: Values) {
    const address = normalizeEmail(values.email);
    if (sending.current || (address === lastEmail && remaining > 0)) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      await requestWithCsrf(portal ? "portal/auth/recovery/request" : "auth/recovery/request", {
        email: address,
      });
      setSentTo(address);
      setLastEmail(address);
      setRemaining(60);
      requestAnimationFrame(() => confirmation.current?.focus());
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "ACCOUNT_NOT_FOUND") {
        setSentTo("");
        form.setError("email", { type: "server", message: cause.message }, { shouldFocus: true });
      } else if (cause instanceof ApiError && cause.status === 429) {
        setError(
          "Too many reset requests. You can request up to three reset emails per hour. Please wait before trying again.",
        );
        setLastEmail(address);
        setRemaining(60);
      } else setError(errorMessage(cause));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-7">
      <header>
        <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-teal-soft text-teal-ink">
          {sentTo ? (
            <MailCheck aria-hidden className="size-6" />
          ) : (
            <KeyRound aria-hidden className="size-6" />
          )}
        </span>
        <h1
          ref={confirmation}
          tabIndex={-1}
          className="font-heading text-3xl font-bold tracking-tight outline-none"
        >
          {sentTo ? "Check your email" : "Reset your password"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {sentTo
            ? "A reset link has been requested for the account below."
            : "Enter the email you use to sign in. We’ll send a link to choose a new password."}
        </p>
      </header>
      {sentTo ? (
        <div className="grid gap-5">
          <div className="flex min-w-0 items-start gap-3 rounded-xl bg-muted/50 p-4">
            <Mail aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-ink" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold break-all">{sentTo}</p>
              <button
                type="button"
                disabled={busy}
                className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => {
                  setSentTo("");
                  setError("");
                  requestAnimationFrame(() => form.setFocus("email"));
                }}
              >
                <Pencil aria-hidden className="size-3.5" />
                Change email
              </button>
            </div>
          </div>
          <div className="space-y-2 text-sm leading-6 text-muted-foreground">
            <p>
              Open the latest “Reset your Medframe password” message and follow its link within{" "}
              <strong className="font-medium text-foreground">15 minutes</strong>.
            </p>
            <p>
              {localInboxUrl
                ? "In this local setup, open the development inbox below. The message will not appear in your real email inbox."
                : "If it hasn’t arrived, check Spam or Junk and confirm the email above is correct."}{" "}
              Requesting another link replaces the previous one.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={busy || cooldown > 0}
            aria-busy={busy}
            onClick={() => void send({ email: sentTo })}
            className="w-full"
          >
            {busy ? (
              <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
            ) : (
              <RefreshCw aria-hidden />
            )}
            {busy
              ? "Requesting link…"
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend reset link"}
          </Button>
        </div>
      ) : (
        <form noValidate onSubmit={form.handleSubmit(send)} className="grid gap-5">
          <FormField
            id="recovery-email"
            label={portal ? "Account email" : "Work email"}
            hint="Use the same address as your Medframe account."
            error={form.formState.errors.email?.message}
          >
            <Input
              id="recovery-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              placeholder="you@example.com"
              disabled={busy}
              aria-required
              aria-invalid={!!form.formState.errors.email}
              aria-describedby="recovery-email-help"
              {...form.register("email")}
            />
          </FormField>
          <Button type="submit" disabled={busy || cooldown > 0} aria-busy={busy} className="w-full">
            {busy ? (
              <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Mail aria-hidden />
            )}
            {busy
              ? "Requesting link…"
              : cooldown > 0
                ? `Send again in ${cooldown}s`
                : "Send reset link"}
          </Button>
        </form>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive"
        >
          {error}
        </p>
      )}
      {localInboxUrl && (
        <aside className="border-t border-border pt-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Mail aria-hidden className="size-4 text-teal-ink" />
            Local development inbox
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Mailpit captures this environment’s emails. Look for the address you entered and the
            Medframe reset message.
          </p>
          <a
            href={localInboxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Open email inbox
            <ArrowUpRight aria-hidden className="size-4" />
          </a>
        </aside>
      )}
      <Link
        href={portal ? "/portal/login" : "/login"}
        className="inline-flex min-h-10 w-fit items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to sign in
      </Link>
    </div>
  );
}
