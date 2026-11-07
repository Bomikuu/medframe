"use client";

import { ReasonField } from "@/components/application/reason-field";
import { reasonSuggestions } from "@/lib/reason-suggestions";

import { AccessRequired } from "@/components/application/access-required";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState, PageHeading } from "@/features/patients/feedback";
import { useSafety } from "@/features/workspace/safety-provider";
import { getGraphqlClient } from "@/lib/graphql/client";
import {
  DiagnosticSetupDocument,
  DiagnosticPartnershipActionDocument,
} from "@/lib/graphql/generated";
import { setupSchema } from "./schema";
import { financialFailure } from "@/features/billing/use-billing";
export function DiagnosticPartnerSettings() {
  const { organizationId, can } = useWorkspace();
  const { confirm } = useSafety();
  const remote = useRemote(DiagnosticSetupDocument, { organizationId, search: "" });
  const parsed = setupSchema.safeParse(remote.data?.diagnosticSetup);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!can("diagnostics.partners.manage"))
    return (
      <AccessRequired
        title="Diagnostic administration access required"
        description="Clinic administrator access is required to manage diagnostic partnerships."
      />
    );
  return (
    <div className="grid gap-6">
      <PageHeading
        title="Diagnostic centers"
        description="Authorize patient choices without granting access to your clinic directory or unrelated records."
      />
      <ReasonField
        id="dx-partner-reason"
        label="Reason for partnership change"
        value={reason}
        onValueChange={setReason}
        suggestions={reasonSuggestions.partnership}
      />
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {!parsed.success ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {parsed.data.centers.map((center) => (
            <li key={center.id} className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div>
                <h2 className="font-semibold">{center.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {center.kind} · {center.modalities.join(", ")} ·{" "}
                  {center.accepting ? "Accepting requests" : "Not accepting new requests"}
                </p>
                <p className="mt-2 text-sm">{center.address || "Address not recorded"}</p>
                <p className="mt-2 text-sm">
                  {center.authorized ? "Authorized for patient selection" : "Not authorized"}
                </p>
              </div>
              <Button
                variant="outline"
                disabled={busy || !reason.trim()}
                onClick={async () => {
                  if (
                    !(await confirm({
                      title: center.authorized ? "Suspend partnership?" : "Authorize center?",
                      description: center.authorized
                        ? "Subsequent center access and download requests will be denied."
                        : "Verified patients may select this center for supported examinations.",
                      action: center.authorized ? "Suspend" : "Authorize",
                    }))
                  )
                    return;
                  setBusy(true);
                  setError("");
                  try {
                    await getGraphqlClient().request(DiagnosticPartnershipActionDocument, {
                      organizationId,
                      action: center.authorized ? "suspend" : "authorize",
                      data: {
                        center_id: center.id,
                        expected_version: center.partnership_version ?? 0,
                        reason,
                      },
                      requestId: crypto.randomUUID(),
                    });
                    remote.reload();
                  } catch (error) {
                    setError(financialFailure(error));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {center.authorized ? "Suspend" : "Authorize"}
              </Button>
            </li>
          ))}
          {!parsed.data.centers.length && (
            <li className="p-6">
              <h2 className="font-semibold">No registered diagnostic centers</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                A platform operator must provision a center before a clinic can authorize it.
                Existing clinic accounts are not converted into center accounts.
              </p>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
