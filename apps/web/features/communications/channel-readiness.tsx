import { KeyRound, Mail, MessageSquare } from "lucide-react";
import type { CommunicationSetup } from "./schema";

export function ChannelReadiness({ setup }: { setup: CommunicationSetup }) {
  return (
    <details className="rounded-xl border border-border bg-card p-5">
      <summary className="w-fit cursor-pointer rounded-sm text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">
        Delivery channels & readiness
      </summary>
      <dl className="mt-5 grid gap-5 md:grid-cols-3">
        {[
          {
            label: "Verification codes",
            icon: KeyRound,
            value: setup.readiness?.verification_sms
              ? "SMSGate configured for codes"
              : "Mobile verification not configured",
            detail:
              "SMSGate verification codes are separate from clinic reminders. Email verification remains available through the configured email route.",
          },
          {
            label: "SMS reminders",
            icon: MessageSquare,
            value:
              setup.transport === "preview"
                ? "Preview only · no SMS delivery"
                : "Twilio reminder transport enabled",
            detail:
              "SMSGate setup does not enable reminder delivery. A live transport still needs a confirmed, opted-in recipient and a valid reminder source.",
          },
          {
            label: "Invitation & account email",
            icon: Mail,
            value: setup.readiness?.email_local
              ? "Captured in local development inbox"
              : "Configured email route",
            detail: setup.readiness?.email_local
              ? "Local messages do not reach a real email inbox. Authorized staff can share invitation links through the native invitation screen."
              : "Queued means awaiting the email worker. Provider acceptance is not proof that the recipient received or read the email.",
          },
        ].map(({ label, icon: Icon, value, detail }) => (
          <div key={label}>
            <dt className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon aria-hidden className="size-4 text-teal-ink" />
              {label}
            </dt>
            <dd className="mt-2 text-sm font-medium">{value}</dd>
            <dd className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        Configuration facts only; this panel does not send a message or test delivery. Reminder
        eligibility requires confirmed consent for the selected purpose and channel, an active
        recipient and a current source record.
      </p>
    </details>
  );
}
