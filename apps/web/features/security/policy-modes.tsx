"use client";

import { Check, KeyRound, MonitorCheck, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type SignInMode = "strict" | "password" | "remember";
export const signInModes = [
  {
    value: "strict" as const,
    label: "Strict",
    Icon: ShieldCheck,
    summary: "Verify every sign-in",
    description: "Require a password and an authenticator code each time staff sign in.",
    detail: "A good fit for shared computers and clinics that want a code at every sign-in.",
  },
  {
    value: "password" as const,
    label: "Password only",
    Icon: KeyRound,
    summary: "Fewer steps for your team",
    description:
      "Use the account password without an extra authenticator code for routine sign-in.",
    detail:
      "Anyone with a staff member’s password can sign in. Existing access permissions still apply.",
  },
  {
    value: "remember" as const,
    label: "Remember for 30 days",
    Icon: MonitorCheck,
    summary: "Verify once on a personal browser",
    description: "Staff can remember a verified browser for 30 days. A password is still required.",
    detail: "New or forgotten browsers need a code. Shared Station browsers cannot be remembered.",
  },
];
export const modeLabel = (mode: SignInMode) =>
  signInModes.find((item) => item.value === mode)!.label;

export function SignInModeChoices({
  value,
  onChange,
  disabled,
}: {
  value: SignInMode;
  onChange: (value: SignInMode) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-4 text-base font-semibold">How should your team sign in?</legend>
      <div className="grid gap-3 lg:grid-cols-3">
        {signInModes.map(({ value: mode, label, Icon, summary, description }) => (
          <label
            key={mode}
            className={cn("relative flex cursor-pointer", disabled && "cursor-wait opacity-60")}
          >
            <input
              type="radio"
              name="clinic-sign-in-mode"
              value={mode}
              checked={value === mode}
              onChange={() => onChange(mode)}
              className="peer sr-only"
              aria-describedby={`mode-${mode}-description`}
            />
            <span className="flex w-full flex-col rounded-xl border border-border bg-card p-5 transition-colors peer-checked:border-primary peer-checked:bg-teal-soft/50 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 hover:border-primary/50">
              <span className="mb-5 flex items-center justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-muted text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full border",
                    value === mode
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {value === mode && <Check className="size-3.5" aria-hidden="true" />}
                </span>
              </span>
              <span className="text-base font-semibold">{label}</span>
              <span className="mt-1 text-sm font-medium text-primary">{summary}</span>
              <span
                id={`mode-${mode}-description`}
                className="mt-3 text-sm leading-6 text-muted-foreground"
              >
                {description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
