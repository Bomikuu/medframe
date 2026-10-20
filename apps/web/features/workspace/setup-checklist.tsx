"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { getGraphqlClient } from "@/lib/graphql/client";
import { ClinicSetupChecklistDocument, DismissClinicSetupDocument } from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { useWorkspace } from "./workspace-provider";

const checklistSchema = z.object({
  available: z.boolean(),
  dismissed: z.boolean().optional(),
  version: z.number().optional(),
  has_patient: z.boolean().optional(),
  has_specialty: z.boolean().optional(),
  has_template: z.boolean().nullable().optional(),
  has_schedule: z.boolean().nullable().optional(),
});
export function useClinicSetup() {
  const { organizationId } = useWorkspace();
  const remote = useRemote(ClinicSetupChecklistDocument, { org: organizationId });
  const parsed = checklistSchema.safeParse(remote.data?.clinicSetupChecklist);
  return {
    ...remote,
    error:
      remote.error ??
      (remote.data && !parsed.success
        ? new Error("Clinic setup progress could not be read.")
        : null),
    state: parsed.success ? parsed.data : null,
  };
}

export function SetupChecklist({ model }: { model: ReturnType<typeof useClinicSetup> }) {
  const { organizationId, workspace, href, can } = useWorkspace();
  const capture = useRequestScope();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const state = model.state;
  if (model.error && !state)
    return (
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm" role="status">
        <p>Clinic setup progress is unavailable.</p>
        <Button variant="outline" size="sm" onClick={model.reload}>
          Retry setup checklist
        </Button>
      </div>
    );
  if (!state?.available || state.dismissed) return null;
  const steps = [
    {
      title: "Clinic workspace",
      detail: "Clinic details, branding and administrator account are saved.",
      complete: true,
      path: "/clinic/settings/appearance",
      action: "Review appearance",
    },
    ...(can("patients.register")
      ? [
          {
            title: "First patient",
            detail: "Register a patient to begin their clinical record.",
            complete: !!state.has_patient,
            path: "/clinic/patients/new",
            action: "Register patient",
          },
        ]
      : []),
    ...(can("organization.manage")
      ? [
          {
            title: "Clinic specialties",
            detail: "Choose which specialty starters are available to your team.",
            complete: !!state.has_specialty,
            path: "/clinic/settings/specialties",
            action: "Choose specialties",
          },
        ]
      : []),
    ...(can("encounters.write") && state.has_template != null
      ? [
          {
            title: "Documentation template",
            detail: "Optional: save reusable prompts for consultations.",
            complete: !!state.has_template,
            path: "/clinic/settings/templates",
            action: "Create template",
          },
        ]
      : []),
    ...(can("schedules.manage") && state.has_schedule != null
      ? [
          {
            title: "Provider availability",
            detail: "Optional: configure availability before taking appointments.",
            complete: !!state.has_schedule,
            path: "/clinic/settings/schedules",
            action: "Set availability",
          },
        ]
      : []),
  ];
  const next = steps.find((step) => !step.complete);
  return (
    <section
      aria-label="New clinic setup checklist"
      className="mb-8 rounded-xl border border-border bg-card p-5 sm:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold wrap-anywhere">
            Welcome to {workspace.organization.name}
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
            {next
              ? "Your workspace is ready. Start with one useful next step."
              : "Your starting setup is saved. Continue with your daily work."}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          disabled={busy}
          aria-label="Dismiss setup checklist"
          onClick={async () => {
            const current = capture();
            setBusy(true);
            setError("");
            try {
              await getGraphqlClient().request(DismissClinicSetupDocument, {
                org: organizationId,
                version: state.version ?? 0,
              });
              if (current()) model.reload();
            } catch {
              if (current()) setError("Unable to dismiss. Refresh setup progress and try again.");
            } finally {
              if (current()) setBusy(false);
            }
          }}
        >
          <X />
        </Button>
      </div>
      {next && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-5 rounded-lg bg-muted/50 p-5">
          <div className="max-w-prose">
            <h3 className="font-semibold">{next.title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{next.detail}</p>
          </div>
          <ButtonLink href={href(next.path)}>{next.action}</ButtonLink>
        </div>
      )}
      <ul className="mt-5 divide-y divide-border">
        {steps.map((step) => (
          <li key={step.title} className="flex items-center justify-between gap-4 py-4 text-sm">
            <div className="flex items-center gap-3">
              {step.complete ? (
                <Check aria-hidden="true" className="size-4 text-teal-ink" />
              ) : (
                <span aria-hidden="true" className="size-4 rounded-full border border-input" />
              )}
              <span>{step.title}</span>
            </div>
            <span className="flex shrink-0 items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {step.complete ? "Saved" : "To do"}
              </span>
              <Link
                href={href(step.path)}
                className="rounded text-xs font-medium text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {step.complete ? "Review" : "Open"}
                <span className="sr-only"> {step.title}</span>
              </Link>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-border pt-4 text-xs leading-6 text-muted-foreground">
        Team access is provisioned by your platform administrator. Specialty selections and setup
        completion do not grant clinical credentials.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
