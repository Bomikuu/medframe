import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Local guidance only. The server remains responsible for accepting passwords. */
export function PasswordGuidance({ password }: { password: string }) {
  const checks = [
    { label: "15–128 characters", met: password.length >= 15 && password.length <= 128 },
    { label: "A capital letter", met: /[A-Z]/.test(password) },
    { label: "A lowercase letter", met: /[a-z]/.test(password) },
    { label: "A number", met: /\d/.test(password) },
    { label: "A special character", met: /[^A-Za-z0-9\s]/.test(password) },
  ];
  const met = checks.filter((check) => check.met).length;
  const level = password.length === 0 ? 0 : !checks[0].met ? 1 : met <= 2 ? 2 : met < 5 ? 3 : 4;
  const labels = [
    "Choose a password",
    "Needs more length",
    "Getting there",
    "Good variety",
    "Strong length and variety",
  ];
  return (
    <div id="password-guidance" className="rounded-xl bg-muted p-4">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold">Password guidance</span>
        <span>{labels[level]}</span>
      </div>
      <div
        role="meter"
        aria-label="Password guidance"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={level}
        aria-valuetext={labels[level]}
        className="mt-3 grid grid-cols-4 gap-1.5"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 rounded-full",
              index < level ? (level < 2 ? "bg-amber-500" : "bg-teal-600") : "bg-border",
            )}
          />
        ))}
      </div>
      <ul className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        {checks.map((check) => {
          const Icon = check.met ? Check : Circle;
          return (
            <li
              key={check.label}
              className={cn(
                "flex items-center gap-2",
                check.met ? "text-teal-800" : "text-muted-foreground",
              )}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              <span>
                <span className="sr-only">{check.met ? "Met: " : "Not yet met: "}</span>
                {check.label}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Length is required; the other checks are suggestions. A long, unique passphrase works too.
        Avoid names, common passwords and reuse.
      </p>
    </div>
  );
}
