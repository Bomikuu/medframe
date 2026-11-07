import { ExternalLink, Mail, Smartphone, Video } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import type { StaffSnapshot } from "./client";

export function SetupReadiness({
  data,
  deliveryHref,
}: {
  data: StaffSnapshot["readiness"];
  deliveryHref?: string;
}) {
  return (
    <details className="group rounded-xl border border-border bg-card p-5 sm:p-6">
      <summary className="min-h-11 cursor-pointer text-base font-semibold focus-visible:rounded focus-visible:outline-2 focus-visible:outline-ring">
        Delivery & online appointment setup
      </summary>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Configuration facts only. No message or connection check is sent when you open this panel.
      </p>
      <dl className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="min-w-0">
          <dt className="flex items-center gap-2 text-sm font-semibold">
            <Mail aria-hidden className="size-4 text-teal-ink" />
            Email
          </dt>
          <dd className="mt-2 text-sm leading-6 text-muted-foreground">
            {data.email_mode === "local_capture"
              ? "Local Mailpit capture. Messages stay in the development inbox; they do not reach real email inboxes."
              : "SMTP settings are present. Sending and inbox delivery have not been verified by this panel."}
          </dd>
          {data.local_inbox && (
            <a
              href={data.local_inbox}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
            >
              Open development inbox
              <ExternalLink aria-hidden className="size-4" />
            </a>
          )}
        </div>
        <div>
          <dt className="flex items-center gap-2 text-sm font-semibold">
            <Smartphone aria-hidden className="size-4 text-teal-ink" />
            SMS
          </dt>
          <dd className="mt-2 text-sm leading-6 text-muted-foreground">
            {data.registration_sms_configured
              ? "Registration codes: SMSGate configured; phone connectivity and delivery are unverified."
              : "Registration codes: SMSGate not configured. Use email verification."}
            <span className="mt-2 block">
              {data.reminder_sms_enabled
                ? "Reminder SMS transport enabled; inspect individual delivery states."
                : "Reminder SMS uses preview mode; no live reminder text is sent."}
            </span>
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 text-sm font-semibold">
            <Video aria-hidden className="size-4 text-teal-ink" />
            Online appointments
          </dt>
          <dd className="mt-2 text-sm leading-6 text-muted-foreground">
            {data.calls.profile === "loopback"
              ? "Local media profile. Internet calls are not configured."
              : data.calls.secure_origin
                ? "Public media profile and secure origin configured. Internet connectivity still needs a real call check."
                : "Public media profile configured, but a trusted HTTPS origin is still required."}
          </dd>
        </div>
      </dl>
      <p className="mt-5 border-t border-border pt-4 text-xs leading-6 text-muted-foreground">
        Invitation created or queued does not mean delivered. A mail worker may retry after a
        failure; recipients must still verify their contact and complete account setup.
      </p>
      {deliveryHref && (
        <ButtonLink href={deliveryHref} variant="outline" className="mt-3">
          Review reminder delivery states
          <ExternalLink aria-hidden className="size-4" />
        </ButtonLink>
      )}
    </details>
  );
}
