"use client";
import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/features/patients/form-controls";
import { LoadState, PageHeading } from "@/features/patients/feedback";
import { useRemote } from "@/features/patients/use-remote";
import { usePortal } from "@/features/portal/portal-provider";
import { getPortalClient } from "@/lib/graphql/portal/client";
import {
  MyDiagnosticRequestDocument,
  MyDiagnosticRequestsDocument,
  SelectDiagnosticCenterDocument,
} from "@/lib/graphql/portal/generated";
import { diagnosticRow, diagnosticPage, centerSchema, stateLabel } from "./schema";
import { financialFailure } from "@/features/billing/use-billing";
const patientDetail = diagnosticRow.extend({ centers: z.array(centerSchema) });
export function PatientDiagnostics({ id }: { id?: string }) {
  return id ? <PatientRequest id={id} /> : <PatientRequestList />;
}
function PatientRequestList() {
  const { linkId, href } = usePortal();
  const [after, setAfter] = useState<string | null>(null);
  const remote = useRemote(
    MyDiagnosticRequestsDocument,
    { linkId, after },
    { client: getPortalClient },
  );
  const parsed = diagnosticPage.safeParse(remote.data?.myDiagnosticRequests);
  return (
    <div className="grid gap-6">
      <PageHeading
        title="Diagnostic requests"
        description="Choose an authorized center and follow your examination progress."
      />
      {!parsed.success ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : (
        <>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {parsed.data.items.map((row) => (
              <li key={row.id}>
                <Link className="block p-5" href={href(`/portal/diagnostics/${row.id}`)}>
                  <h2 className="font-semibold">{row.test_name}</h2>
                  <p className="mt-2 text-sm capitalize">{stateLabel(row.state)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {row.center_name ?? "Choose an authorized center"}
                  </p>
                </Link>
              </li>
            ))}
            {!parsed.data.items.length && (
              <li className="p-6">
                Your clinic has not issued any diagnostic requests for this connection.
              </li>
            )}
          </ul>
          <div className="flex gap-3">
            <Button variant="outline" disabled={!after} onClick={() => setAfter(null)}>
              Newest
            </Button>
            <Button
              variant="outline"
              disabled={!parsed.data.has_next_page}
              onClick={() => setAfter(parsed.data.end_cursor)}
            >
              Older
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
function PatientRequest({ id }: { id: string }) {
  const { linkId, href } = usePortal();
  const [center, setCenter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remote = useRemote(
    MyDiagnosticRequestDocument,
    { linkId, requestId: id },
    { client: getPortalClient },
  );
  const parsed = patientDetail.safeParse(remote.data?.myDiagnosticRequest);
  if (!parsed.success) return <LoadState error={remote.error} retry={remote.reload} />;
  const row = parsed.data;
  return (
    <section className="grid gap-6">
      <PageHeading title={row.test_name} description={`${row.number} · ${stateLabel(row.state)}`} />
      <div className="grid gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
        <p>
          Selected center: <strong>{row.center_name ?? "Not selected"}</strong>
        </p>
        {row.instructions && (
          <div>
            <h2 className="font-semibold">Preparation instructions</h2>
            <p className="mt-2 text-sm leading-7 whitespace-pre-wrap">{row.instructions}</p>
          </div>
        )}
        {row.centers.length ? (
          <form
            className="grid gap-4 border-t border-border pt-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await getPortalClient().request(SelectDiagnosticCenterDocument, {
                  linkId,
                  diagnosticRequestId: id,
                  centerId: center,
                  expectedVersion: row.version,
                  requestId: crypto.randomUUID(),
                });
                setCenter("");
                remote.reload();
              } catch (error) {
                setError(financialFailure(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            <FormSelect
              id="patient-dx-center"
              label="Choose an authorized diagnostic center"
              value={center}
              onChange={setCenter}
              options={[
                { value: "", label: "Choose center" },
                ...row.centers.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            {row.centers
              .filter((c) => c.id === center)
              .map((c) => (
                <div key={c.id} className="text-sm leading-7">
                  <p>
                    {c.kind} · {c.modalities.join(", ")}
                  </p>
                  <p>{c.address || "Address not recorded; contact your clinic for directions."}</p>
                </div>
              ))}
            <p className="text-sm leading-6 text-muted-foreground">
              Selection shares the clinic's referral package with this center. You can change
              centers before acceptance. Contact your clinic afterwards.
            </p>
            <Button disabled={busy || !center}>
              {busy ? "Saving…" : "Confirm center selection"}
            </Button>
          </form>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            {["awaiting_center", "sent"].includes(row.state)
              ? "No authorized center is currently available. Contact your clinic."
              : "Center selection is closed for the current request state."}
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <p className="text-sm leading-6 text-muted-foreground">
          Results become visible only after your clinician reviews and explicitly shares them.
        </p>
        <Link href={href("/portal")} className="text-primary underline underline-offset-4">
          View shared clinical records
        </Link>
      </div>
    </section>
  );
}
