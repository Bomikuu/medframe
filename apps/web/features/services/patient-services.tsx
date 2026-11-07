"use client";

import { PersonIdentity } from "@/components/application/person-identity";

import { usePatientRecordReadOnly } from "@/features/patients/profile/patient-record-browse";

import { useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EntrySheet, useEntrySheetActions } from "@/components/application/entry-sheet";
import { FormSelect } from "@/features/patients/form-controls";
import { LoadState, RemoteNotice } from "@/features/patients/feedback";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { PatientServicesDocument, ServicePatientsDocument } from "@/lib/graphql/generated";
import { ServicePicker } from "@/features/billing/service-picker";
import { FinancialNotice, PageNavigation } from "@/features/billing/controls";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { caseSchema, casesSchema, type Service } from "./schema";
import { useServiceAction } from "./use-services";
import { ServiceCaseDetail } from "./service-case";

const patientsSchema = z.array(
  z.object({ id: z.string(), name: z.string(), reference: z.string() }),
);
export function NewPatientService({
  branchId,
  patientId,
  service: initial,
  saved,
}: {
  branchId: string;
  patientId?: string;
  service?: Service;
  saved: () => void;
}) {
  const { organizationId } = useWorkspace();
  const [service, setService] = useState<Service | undefined>(initial);
  const [patient, setPatient] = useState(patientId ?? "");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const action = useServiceAction("case");
  const sheet = useEntrySheetActions();
  const remote = useRemote(
    ServicePatientsDocument,
    { organizationId, branchId, search: query },
    { enabled: !patientId },
  );
  const parsed = patientsSchema.safeParse(remote.data?.servicePatients);
  useUnsavedChanges(
    `service-case-new:${branchId}:${patientId ?? "new"}`,
    !!patient || (!!service && !initial),
    () => {
      setPatient("");
      setService(initial);
    },
  );
  return (
    <div className="grid gap-5">
      {!patientId && (
        <>
          <div className="flex gap-2">
            <Input
              aria-label="Search patients for service"
              type="search"
              value={search}
              maxLength={160}
              placeholder="Patient name or reference"
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" onClick={() => setQuery(search)}>
              Find patient
            </Button>
          </div>
          <FormSelect
            id="service-case-patient"
            label="Patient"
            personKind="patient"
            value={patient}
            onChange={setPatient}
            options={(parsed.data ?? []).map((x) => ({
              value: x.id,
              label: `${x.name} · ${x.reference}`,
            }))}
          />
          <RemoteNotice error={remote.error} retry={remote.reload} />
        </>
      )}
      {!initial && <ServicePicker branchId={branchId} onSelect={setService} />}
      {service && (
        <div className="rounded-lg bg-muted/60 p-4 text-sm">
          <h3 className="font-semibold">{service.name}</h3>
          <p className="mt-2 text-muted-foreground">
            {service.workflow.length} workflow steps will be copied. Billing is reviewed separately.
          </p>
        </div>
      )}
      <FinancialNotice error={action.error} />
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => sheet?.cancel()}>
          Cancel
        </Button>
        <Button
          disabled={!patient || !service || action.busy}
          onClick={async () => {
            if (!service) return;
            const result = await action.run("create", {
              branch_id: branchId,
              patient_id: patient,
              service_id: service.id,
              service_version: service.version,
              expected_version: 0,
            });
            if (caseSchema.safeParse(result).success) {
              saved();
              sheet?.complete();
            }
          }}
        >
          {action.busy ? "Creating…" : "Start patient service"}
        </Button>
      </div>
    </div>
  );
}

export function PatientServices({ branchId, patientId }: { branchId: string; patientId?: string }) {
  const { organizationId, can } = useWorkspace();
  const readOnly = usePatientRecordReadOnly();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [after, setAfter] = useState<string | null>(null);
  const remote = useRemote(PatientServicesDocument, {
    organizationId,
    branchId,
    patientId: patientId ?? null,
    filters: { query: search, status },
    after,
  });
  const parsed = casesSchema.safeParse(remote.data?.patientServices);
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Patient services</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track the work independently from its payment status.
          </p>
        </div>
        {!readOnly && can("services.work") && (
          <EntrySheet
            title="Start patient service"
            description="Copy a clinic service workflow to a verified patient record."
            triggerVariant="default"
          >
            <NewPatientService branchId={branchId} patientId={patientId} saved={remote.reload} />
          </EntrySheet>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
        <Input
          aria-label="Search patient services"
          type="search"
          maxLength={160}
          placeholder="Patient, reference or service"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setAfter(null);
          }}
        />
        <FormSelect
          id="case-filter"
          label="Workflow status"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setAfter(null);
          }}
          options={[
            { value: "all", label: "All workflows" },
            { value: "active", label: "Active" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
      </div>
      <RemoteNotice error={remote.error} retry={remote.reload} />
      {!parsed.success ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : (
        <>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {!parsed.data.items.length && (
              <div className="p-8">
                <h3 className="font-semibold">No patient services yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start a service to copy its workflow and prepare a payment agreement.
                </p>
              </div>
            )}
            {parsed.data.items.map((row) => (
              <article
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div>
                  <h3 className="font-semibold">{row.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <PersonIdentity kind="patient" name={row.patient_name} /> · {row.reference}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground capitalize">
                    {row.status} ·{" "}
                    {row.steps.filter((x) => ["completed", "skipped"].includes(x.status)).length}/
                    {row.steps.length} steps
                  </p>
                </div>
                {!readOnly && (
                  <EntrySheet
                    title="Patient service"
                    description="Operational workflow and its independent billing agreement."
                    trigger="Open service"
                  >
                    <ServiceCaseDetail caseId={row.id} updated={remote.reload} />
                  </EntrySheet>
                )}
              </article>
            ))}
          </div>
          <PageNavigation after={after} next={parsed.data.end_cursor} change={setAfter} />
        </>
      )}
    </div>
  );
}
