"use client";

import { usePatientRecordReadOnly } from "@/features/patients/profile/patient-record-browse";

import { useRequestScope } from "./use-request-scope";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PatientAccessDocument,
  EligibleAssigneesDocument,
  ChangePatientAccessDocument,
  type AssigneeDetailsFragment,
} from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety } from "@/features/workspace/safety-provider";
import { useRemote } from "./use-remote";
import { LoadState, failureText } from "./feedback";

export function PatientAccess({ patientId }: { patientId: string }) {
  const { organizationId } = useWorkspace();
  const readOnly = usePatientRecordReadOnly();
  const { confirm } = useSafety();
  const captureRequest = useRequestScope();
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const grants = useRemote(PatientAccessDocument, { organizationId, patientId });
  const eligible = useRemote(EligibleAssigneesDocument, { organizationId, patientId, query });
  async function change(staff: AssigneeDetailsFragment, active: boolean) {
    const isCurrent = captureRequest();
    if (
      !(await confirm({
        title: `${active ? "Grant" : "Revoke"} patient access?`,
        description: active
          ? `${staff.displayName} will be able to access this patient’s medical information while their clinical role and branch remain eligible.`
          : `${staff.displayName} will lose access to this patient’s medical information on subsequent requests. Their existing authored records will remain.`,
        action: active ? "Grant access" : "Revoke access",
      }))
    )
      return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await getGraphqlClient().request(ChangePatientAccessDocument, {
        organizationId,
        patientId,
        membershipId: staff.membershipId,
        active,
      });
      if (!isCurrent()) return;
      grants.reload();
      eligible.reload();
      setMessage(`Patient access ${active ? "granted to" : "revoked for"} ${staff.displayName}.`);
    } catch (failure) {
      if (!isCurrent()) return;
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="grid gap-5 border-t border-border pt-8">
      <div>
        <h2 className="text-xl font-semibold">Clinical access</h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
          Assign eligible clinicians explicitly. Administrative access to this page does not grant
          access to medical history.
        </p>
      </div>
      {!grants.data ? (
        <LoadState error={grants.error} retry={grants.reload} />
      ) : (
        <div>
          <h3 className="text-sm font-semibold">Current assignments</h3>
          {!grants.data.patientAccessGrants.filter((item) => item.active).length ? (
            <p className="mt-3 text-sm text-muted-foreground">No active clinical assignments.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {grants.data.patientAccessGrants
                .filter((item) => item.active)
                .map((staff) => (
                  <li
                    key={staff.membershipId}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div>
                      <span className="text-sm font-medium">{staff.displayName}</span>
                      <p className="mt-1 text-xs text-muted-foreground">{staff.branchLabel}</p>
                    </div>
                    {!readOnly && (
                      <Button
                        variant="outline"
                        disabled={busy || grants.loading}
                        onClick={() => {
                          void change(staff, false);
                        }}
                      >
                        Revoke access
                      </Button>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
      {!readOnly && (
        <>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(draft);
              if (query === draft) eligible.reload();
            }}
            className="flex max-w-xl flex-wrap items-end gap-3"
          >
            <div className="min-w-0 flex-1 basis-48">
              <label htmlFor="assigneeSearch" className="mb-2 block text-sm font-medium">
                Find a clinician by name
              </label>
              <Input
                ref={input}
                id="assigneeSearch"
                value={draft}
                maxLength={160}
                onChange={(event) => setDraft(event.target.value)}
                autoComplete="off"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
            {draft && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDraft("");
                  setQuery("");
                  eligible.reload();
                  input.current?.focus();
                }}
              >
                Clear clinician search
              </Button>
            )}
          </form>
          {!eligible.data ? (
            <LoadState error={eligible.error} retry={eligible.reload} />
          ) : (
            <div>
              <h3 className="text-sm font-semibold">Eligible clinicians</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Showing up to 20 matches. Refine the search to find another clinician.
              </p>
              <ul className="mt-2 divide-y divide-border">
                {eligible.data.eligiblePatientAssignees
                  .filter(
                    (staff) =>
                      !grants.data?.patientAccessGrants.some(
                        (grant) => grant.membershipId === staff.membershipId && grant.active,
                      ),
                  )
                  .map((staff) => (
                    <li
                      key={staff.membershipId}
                      className="flex flex-wrap items-center justify-between gap-3 py-4"
                    >
                      <div>
                        <span className="text-sm font-medium">{staff.displayName}</span>
                        <p className="mt-1 text-xs text-muted-foreground">{staff.branchLabel}</p>
                      </div>
                      <Button
                        variant="outline"
                        disabled={busy || grants.loading}
                        onClick={() => {
                          void change(staff, true);
                        }}
                      >
                        Grant access
                      </Button>
                    </li>
                  ))}
              </ul>
              {!eligible.data.eligiblePatientAssignees.length && (
                <p className="py-4 text-sm text-muted-foreground">
                  No eligible clinicians match this search.
                </p>
              )}
            </div>
          )}
        </>
      )}
      {error ? (
        <p role="alert" className="text-sm leading-6 text-destructive">
          {failureText(error)}
        </p>
      ) : null}
      <p role="status" className="text-sm text-muted-foreground">
        {busy ? "Updating patient access…" : message}
      </p>
    </section>
  );
}
