import { Check, Circle, ArrowRight } from "lucide-react";
import type { DiagnosticDetail } from "./schema";
import { cn } from "@/lib/utils";

/** Referral sharing and patient release are deliberately separate from result review. */
export function DiagnosticProgress({ row }: { row: DiagnosticDetail }) {
  const examination = ["performed", "results_available", "reviewed"].includes(row.state);
  const steps = [
    { label: "Request prepared", done: row.state !== "draft" },
    { label: "Center accepted", done: !!row.accepted_at },
    { label: "Examination recorded", done: examination },
    { label: "Results available", done: !!row.result },
    { label: "Clinically reviewed", done: !!row.result?.review },
  ];
  const next =
    row.state === "cancelled"
      ? "Request cancelled. The clinic can review its preserved history."
      : row.state === "draft"
        ? "Clinic: finish and send the referral request."
        : !row.sharing
          ? "Clinic: referral sharing is withdrawn. Review access before continuing."
          : row.state === "awaiting_center"
            ? "Patient or clinic: select an eligible diagnostic center."
            : row.state === "sent"
              ? `${row.center_name ?? "Diagnostic center"}: accept or respond to this request.`
              : row.state === "accepted"
                ? `${row.center_name ?? "Diagnostic center"}: record the examination when performed.`
                : row.state === "performed"
                  ? `${row.center_name ?? "Diagnostic center"}: submit the result for review.`
                  : row.result && !row.result.review
                    ? "Clinic provider: review this exact result and record the next steps."
                    : row.result?.review
                      ? "Clinic provider: coordinate follow-up and decide what to share with the patient."
                      : "Clinic: review the request’s current status before continuing.";
  return (
    <section
      className="rounded-xl border border-border bg-card p-4 sm:p-5"
      aria-label="Diagnostic progress"
    >
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map(({ label, done }) => {
          const Icon = done ? Check : Circle;
          return (
            <li key={label} className="flex items-center gap-2.5 text-xs">
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full",
                  done ? "bg-teal-soft text-teal-ink" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon aria-hidden className="size-3.5" />
              </span>
              <span>
                {label}
                <span className="sr-only">: {done ? "recorded" : "not yet recorded"}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 flex items-start gap-2 border-t border-border pt-3 text-sm leading-6">
        <ArrowRight aria-hidden className="mt-1 size-4 shrink-0 text-teal-ink" />
        <span>{next}</span>
      </p>
      <p className="mt-1 pl-6 text-xs leading-5 text-muted-foreground">
        Result review does not automatically publish a record to the patient portal.
      </p>
    </section>
  );
}
