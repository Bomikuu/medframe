"use client";

import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { ConsultationsDocument } from "@/lib/graphql/generated";
import { ButtonLink } from "@/components/ui/button-link";
import { StatusBadge } from "@/components/application/status-badge";
import { LoadState } from "@/features/patients/feedback";
import { ReceiveHandoff } from "./receive-handoff";

export function ClinicianHome() {
  const { organizationId, href, can, overview } = useWorkspace();
  const remote = useRemote(ConsultationsDocument, { organizationId });
  if (!can("patients.clinical.read"))
    return (
      <p role="alert">
        A clinical membership and patient access are required. Contact your clinic administrator.
      </p>
    );
  return (
    <div className="grid gap-8">
      <header className="border-b border-border pb-6">
        <h1 className="text-3xl font-semibold">Your clinical Station</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Signed in as {overview.currentUser.displayName || "clinic staff"}. Open permitted care or
          accept a saved consultation from another device.
        </p>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Continue care</h2>
            <ButtonLink variant="outline" href={href("/clinic/patients")}>
              Choose patient
            </ButtonLink>
          </div>
          {!remote.data ? (
            <LoadState error={remote.error} retry={remote.reload} />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {remote.data.encounters
                .filter((e) => e.editable || e.status === "completed")
                .map((encounter) => (
                  <li
                    key={encounter.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-5"
                  >
                    <div>
                      <h3 className="font-semibold">{encounter.patientName}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{encounter.reason}</p>
                      <div className="mt-3">
                        <StatusBadge value={encounter.status} />
                      </div>
                    </div>
                    <ButtonLink href={href(`/station/clinician/consultations/${encounter.id}`)}>
                      Open consultation
                    </ButtonLink>
                  </li>
                ))}
              {!remote.data.encounters.some((e) => e.editable || e.status === "completed") && (
                <li className="p-6 text-sm leading-6 text-muted-foreground">
                  No unfinished consultations are visible to your account. Start care from an
                  authorized patient, or receive a handoff.
                </li>
              )}
            </ul>
          )}
        </section>
        <ReceiveHandoff />
      </div>
    </div>
  );
}
