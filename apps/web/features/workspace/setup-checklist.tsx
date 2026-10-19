"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGraphqlClient } from "@/lib/graphql/client";
import { ClinicSetupChecklistDocument, DismissClinicSetupDocument } from "@/lib/graphql/generated";
import { useWorkspace } from "./workspace-provider";
export function SetupChecklist() {
  const { organizationId, href, can } = useWorkspace();
  const [state, setState] = useState<{
    available: boolean;
    dismissed?: boolean;
    version?: number;
    has_patient?: boolean;
  }>();
  const [error, setError] = useState("");
  useEffect(() => {
    getGraphqlClient()
      .request(ClinicSetupChecklistDocument, { org: organizationId })
      .then((result) => setState(result.clinicSetupChecklist as typeof state))
      .catch(() => {});
  }, [organizationId]);
  if (!state?.available || state.dismissed) return null;
  return (
    <section
      aria-label="New clinic setup checklist"
      className="mb-8 rounded-xl border border-teal-700/20 bg-teal-50/40 p-5 sm:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">A good start for your clinic</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your workspace is ready. Take the next steps at your own pace.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Dismiss setup checklist"
          onClick={async () => {
            try {
              await getGraphqlClient().request(DismissClinicSetupDocument, {
                org: organizationId,
                version: state.version ?? 0,
              });
              setState({ ...state, dismissed: true });
            } catch {
              setError("Unable to dismiss. Please try again.");
            }
          }}
        >
          <X />
        </Button>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {["Clinic information", "Workspace branding", "Administrator account"].map((title) => (
          <div key={title} className="flex items-center gap-3 text-sm">
            <Check className="size-4 text-teal-700" />
            {title}
            <span className="ml-auto text-xs text-teal-800">Complete</span>
          </div>
        ))}
        <div className="flex items-center gap-3 text-sm">
          <Check className={`size-4 ${state.has_patient ? "text-teal-700" : "text-slate-300"}`} />
          First patient
          {can("patients.register") && (
            <Link
              className="ml-auto text-xs text-primary underline"
              href={href("/clinic/patients/new")}
            >
              {state.has_patient ? "Register another" : "Register patient"}
            </Link>
          )}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-t border-teal-900/10 pt-5 text-xs">
        <Link
          href={href("/clinic/settings/appearance")}
          className="flex items-center gap-2 text-primary"
        >
          Review appearance
          <ArrowRight className="size-3" />
        </Link>
        <p className="text-muted-foreground">
          Team invitations: upcoming. Team access is currently provisioned by your platform
          administrator.
        </p>
      </div>
      {!state.has_patient && (
        <p className="mt-5 text-sm leading-7 text-muted-foreground">
          No patients yet. Register your first patient to begin managing clinical records.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
