import { CheckCircle2, Clock3, Eye, HelpCircle, Send, ShieldAlert, XCircle } from "lucide-react";

const states: Record<string, { title: string; detail: string; icon: typeof Clock3 }> = {
  scheduled: {
    title: "Queued for dispatch",
    detail:
      "Waiting until its scheduled time. Recipient consent and source eligibility are checked again before sending.",
    icon: Clock3,
  },
  preview: {
    title: "Preview only",
    detail: "No external SMS was sent. This is a development preview of the reminder.",
    icon: Eye,
  },
  accepted: {
    title: "Accepted by provider",
    detail:
      "The provider accepted the message. Delivery to the recipient is not confirmed yet; do not create a duplicate.",
    icon: Send,
  },
  delivered: {
    title: "Delivery confirmed",
    detail:
      "A delivery acknowledgement was recorded. This does not confirm that the patient read it.",
    icon: CheckCircle2,
  },
  retryable_failure: {
    title: "Eligible for retry",
    detail:
      "A known retryable failure was recorded. Use the existing retry action; the server rechecks consent, source status and attempt limits.",
    icon: ShieldAlert,
  },
  permanent_failure: {
    title: "Needs staff review",
    detail:
      "Automatic retry has stopped. Check the recipient and failure code before arranging another reminder.",
    icon: XCircle,
  },
  unknown: {
    title: "Outcome uncertain",
    detail:
      "The message may have been accepted. Check with the provider before scheduling another; automatic retry is disabled to avoid duplicate sends.",
    icon: HelpCircle,
  },
  cancelled: {
    title: "Cancelled",
    detail:
      "No further attempt will be made for this reminder. A message already accepted by the provider cannot be recalled.",
    icon: XCircle,
  },
};
export function DeliveryState({ state }: { state: string }) {
  const item = states[state];
  if (!item)
    return (
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Current delivery state: {state.replaceAll("_", " ")}. Check its history before taking
        another action.
      </p>
    );
  const Icon = item.icon;
  return (
    <div
      className={`mt-3 flex max-w-prose gap-2 rounded-lg p-3 text-xs leading-5 ${state === "unknown" ? "bg-warning-soft text-foreground" : "bg-muted/40 text-muted-foreground"}`}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium text-foreground">{item.title}</p>
        <p className="mt-1">{item.detail}</p>
      </div>
    </div>
  );
}
