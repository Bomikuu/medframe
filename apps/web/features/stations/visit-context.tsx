"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { PatientBilling } from "@/features/billing/patient-billing";
import { errorMessage } from "@/lib/auth/client";
import { stationRequest } from "./client";

type Visit = { tickets: { number: number; status: string; counter: string; issued_at: string }[] };
export function VisitContext({
  patientId,
  branchId,
  encounterId,
}: {
  patientId: string;
  branchId: string;
  encounterId: string;
}) {
  const { organizationId, can } = useWorkspace();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void stationRequest<Visit>("encounter", {
      organization_id: organizationId,
      encounter_id: encounterId,
      action: "visit",
    })
      .then((result) => {
        if (active) setVisit(result);
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      });
    return () => {
      active = false;
    };
  }, [organizationId, encounterId]);
  return (
    <div className="grid gap-8">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xl font-semibold">Visit & service status</h2>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {visit ? (
          visit.tickets.length ? (
            <ul className="mt-4 divide-y divide-border">
              {visit.tickets.map((ticket) => (
                <li
                  key={`${ticket.number}:${ticket.issued_at}`}
                  className="flex flex-wrap justify-between gap-3 py-4"
                >
                  <div>
                    <p className="font-semibold">Consultation · Queue {ticket.number}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {ticket.counter || "Room not assigned"}
                    </p>
                  </div>
                  <p className="text-sm capitalize">{ticket.status.replaceAll("_", " ")}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No queue ticket is linked to this consultation. Walk-in care can continue without one.
            </p>
          )
        ) : (
          !error && (
            <p className="mt-3 text-sm" role="status">
              Loading linked service status…
            </p>
          )
        )}
      </section>
      <section>
        <h2 className="mb-5 text-xl font-semibold">Bills & payments</h2>
        {can("billing.read") ? (
          <PatientBilling patientId={patientId} branchId={branchId} />
        ) : (
          <p className="rounded-xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
            Your membership does not include financial access. An authorized cashier can review
            bills and confirm payments. Being a clinician does not grant payment permission.
          </p>
        )}
      </section>
    </div>
  );
}
