import { LifeBuoy, Mail, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { stepDetails } from "./step-details";
import { titles, type Step } from "./schema";

export function OnboardingHelp({
  step,
  verification = false,
}: {
  step: Step;
  verification?: boolean;
}) {
  const items = verification
    ? [
        "Choose Send verification code, then open the invited email inbox.",
        "Copy the newest six-digit code and paste it into the boxes. Codes expire after 10 minutes.",
        "If it does not arrive, check spam or use Send a new code after the countdown. Ask your administrator if the invited address is wrong.",
      ]
    : stepDetails[step].help;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <LifeBuoy aria-hidden="true" />
          Help & support
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogTitle>
          {verification ? "Verifying your invitation" : `Help with ${titles[step].toLowerCase()}`}
        </DialogTitle>
        <DialogDescription>Follow these steps to keep your clinic setup moving.</DialogDescription>
        <ol className="mt-3 space-y-5">
          {items.map((item, index) => (
            <li key={item} className="flex gap-3 text-sm leading-6">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-teal-900">
                {index + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 space-y-3 border-t pt-4 text-xs leading-6 text-muted-foreground">
          <p className="flex items-start gap-2">
            <Save className="mt-1 size-4 shrink-0" aria-hidden="true" />
            Watch the save status. Save and exit waits for the current section to save; passwords
            are never saved in drafts.
          </p>
          <p className="flex items-start gap-2">
            <Mail className="mt-1 size-4 shrink-0" aria-hidden="true" />
            Return using your original invitation, verify your email, then resume. Account-linked
            drafts also require the same account and MFA.
          </p>
          {process.env.NODE_ENV === "development" && (
            <a
              className="inline-block font-medium text-primary underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
              href="http://localhost:58025"
            >
              Open local development inbox
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
