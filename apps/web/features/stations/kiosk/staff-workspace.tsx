"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useOperationsSetup } from "@/features/operations/use-operations";
import { BranchChoice } from "@/features/operations/controls";
import { LoadState, PageHeading } from "@/features/patients/feedback";
import { stationRequest } from "../client";
import { errorMessage } from "@/lib/auth/client";
import { DepartmentDialog, StageDialog, type StaffTicket } from "./staff-dialogs";
import { clinicTime, type Department, type Provider } from "./types";

type Intake = {
  id: string;
  name: string;
  phone: string;
  date_of_birth: string | null;
  version: number;
  created_at: string;
};
type Data = {
  departments: Department[];
  providers: Provider[];
  tickets: StaffTicket[];
  intakes: Intake[];
  timezone: string;
};
export function KioskStaffWorkspace() {
  const { can, href } = useWorkspace();
  const [branch, setBranch] = useState("");
  const remote = useOperationsSetup(branch);
  if (!can("operations.read")) return <p role="alert">Clinic operations access is required.</p>;
  if (!remote.setup) return <LoadState error={remote.error} retry={remote.reload} />;
  return (
    <div className="grid gap-7">
      <PageHeading
        title="Patient Stations & departments"
        description="Verify kiosk patients, coordinate one visit across services and review registration requests."
      >
        <ButtonLink href={href("/clinic/queue")} variant="outline">
          Consultation queue
        </ButtonLink>
        {can("organization.manage") && (
          <ButtonLink href={href("/clinic/settings/stations")} variant="outline">
            Devices & Stations
          </ButtonLink>
        )}
      </PageHeading>
      <BranchChoice setup={remote.setup} change={setBranch} />
      <StaffBoard key={remote.setup.branch_id} branch={remote.setup.branch_id} />
    </div>
  );
}
function StaffBoard({ branch }: { branch: string }) {
  const { organizationId, can } = useWorkspace();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Department | null | undefined>(undefined);
  const [stage, setStage] = useState<StaffTicket | null>(null);
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<{ id: string; name: string; reference: string }[]>([]);
  const [patient, setPatient] = useState("");
  const [verified, setVerified] = useState(false);
  const [code, setCode] = useState<{ code: string; expires_at: string } | null>(null);
  const [filter, setFilter] = useState("all");
  const request = useCallback(
    <T,>(body: Record<string, unknown>) =>
      stationRequest<T>("kiosk/manage", {
        organization_id: organizationId,
        branch_id: branch,
        ...body,
      }),
    [organizationId, branch],
  );
  const refresh = useCallback(async () => {
    try {
      setData(await request<Data>({ action: "snapshot" }));
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, [request]);
  useEffect(() => {
    let active = true;
    const tick = () =>
      void request<Data>({ action: "snapshot" })
        .then((value) => {
          if (active) setData(value);
        })
        .catch((cause) => {
          if (active) setError(errorMessage(cause));
        });
    tick();
    const timer = window.setInterval(tick, 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [request]);
  useEffect(() => {
    if (!code) return;
    const timer = window.setTimeout(
      () => setCode(null),
      Math.max(0, new Date(code.expires_at).getTime() - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [code]);
  async function run(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const value = await request(body);
      await refresh();
      return value;
    } catch (cause) {
      setError(errorMessage(cause));
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  async function search() {
    setPatient("");
    setVerified(false);
    setCode(null);
    const result = (await run({ action: "patients", query })) as
      { patients: typeof patients } | undefined;
    if (result) setPatients(result.patients);
  }
  if (!data) return <LoadState error={error} retry={() => void refresh()} />;
  const tickets = data.tickets.filter((item) => filter === "all" || item.department_id === filter);
  return (
    <div className="grid gap-9">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <section aria-label="Patient verification" className="border-b border-border pb-7">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <ShieldCheck className="size-5 text-teal-ink" />
          Patient kiosk access
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Verify the patient’s identity in person, select their existing record, then issue a
          one-use code. Device pairing is separate. A code lasts five minutes.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
          className="mt-5 flex max-w-xl items-end gap-3"
        >
          <div className="min-w-0 flex-1">
            <FormField id="kiosk-patient-search" label="Find patient by name or clinic reference">
              <Input
                id="kiosk-patient-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                minLength={2}
                maxLength={160}
                required
              />
            </FormField>
          </div>
          <Button type="submit" disabled={busy}>
            Find
          </Button>
        </form>
        {patients.length > 0 && (
          <div className="mt-4 grid max-w-xl gap-4">
            <FormSelect
              id="kiosk-patient"
              label="Patient record"
              value={patient}
              onChange={(value) => {
                setPatient(value);
                setVerified(false);
                setCode(null);
              }}
              options={patients.map((item) => ({
                value: item.id,
                label: `${item.name} · ${item.reference}`,
              }))}
            />
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <Checkbox
                checked={verified}
                onCheckedChange={(value) => setVerified(value === true)}
              />
              I verified this patient’s identity in person.
            </label>
            <Button
              type="button"
              className="justify-self-start"
              disabled={!patient || !verified || busy}
              onClick={() =>
                void run({
                  action: "issue",
                  patient_id: patient,
                  method: "in_person_identity_verified",
                }).then((value) => {
                  if (value) setCode(value as { code: string; expires_at: string });
                })
              }
            >
              Generate patient code
            </Button>
          </div>
        )}
        {code && (
          <div className="bg-teal-wash mt-5 max-w-xl rounded-lg p-5 text-teal-ink" role="status">
            <p className="text-sm font-medium">Patient verification code</p>
            <p className="mt-3 text-2xl font-semibold tracking-[0.2em] select-all">{code.code}</p>
            <p className="mt-3 text-xs">
              Expires {clinicTime(code.expires_at, data.timezone)} · Show only to the verified
              patient.
            </p>
            <Button type="button" variant="ghost" onClick={() => setCode(null)} className="mt-3">
              Hide code
            </Button>
          </div>
        )}
      </section>
      <section aria-label="Department queues">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Today’s department queues</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              One visit, with a history of each service stage. Up to 200 tickets shown.
            </p>
          </div>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void refresh()}>
            <RefreshCw />
            Refresh
          </Button>
        </div>
        <div className="mb-5 max-w-xs">
          <FormSelect
            id="queue-department-filter"
            label="Department"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All departments" },
              ...data.departments.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                {["Ticket / service", "Patient", "State", "Issued", "Actions"].map((label) => (
                  <th key={label} className="px-3 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((row) => (
                <tr key={row.id} className="border-b border-border">
                  <td className="px-3 py-4">
                    <strong>{row.label}</strong>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.department}
                      {row.queue_number ? ` · Consultation #${row.queue_number}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-4">
                    {row.patient}
                    <p className="mt-1 text-xs text-muted-foreground">{row.patient_reference}</p>
                  </td>
                  <td className="px-3 py-4 capitalize">
                    {row.status.replaceAll("_", " ")}
                    {row.priority && (
                      <span className="ml-2 text-xs font-semibold text-amber-800">Priority</span>
                    )}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    {clinicTime(row.issued_at, data.timezone)}
                  </td>
                  <td className="px-3 py-4">
                    {can("queues.manage") && row.visit_state === "open" && (
                      <div className="flex flex-wrap gap-2">
                        {row.status !== "transferred" && row.status !== "cancelled" && (
                          <Button type="button" variant="outline" onClick={() => setStage(row)}>
                            Manage {row.label}
                          </Button>
                        )}
                        {["completed", "skipped", "cancelled"].includes(row.status) && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              void run({ action: "close_visit", visit_id: row.visit_id })
                            }
                          >
                            Close visit
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!tickets.length && (
          <p className="py-8 text-sm text-muted-foreground">No tickets in this department today.</p>
        )}
      </section>
      <section aria-label="Registration review">
        <h2 className="text-xl font-semibold">Registration requests</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Check identity and duplicates. To link a request, first select the verified existing
          patient above. A request never creates or links a record on its own.
        </p>
        <div className="mt-5 grid gap-5">
          {data.intakes.map((row) => (
            <div key={row.id} className="border-b border-border pb-5">
              <h3 className="font-semibold">{row.name}</h3>
              <p className="mt-2 text-sm">
                {row.phone}
                {row.date_of_birth ? ` · Born ${row.date_of_birth}` : ""} · Reference{" "}
                {row.id.slice(0, 8).toUpperCase()}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || !verified || !patient}
                  onClick={() =>
                    void run({
                      action: "review_intake",
                      intake_id: row.id,
                      expected_version: row.version,
                      patient_id: patient,
                      identity_verified: true,
                    })
                  }
                >
                  Link verified selected patient
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Identity verified and duplicate search completed for ${row.name}? This creates a new patient record.`,
                      )
                    )
                      void run({
                        action: "review_intake",
                        intake_id: row.id,
                        expected_version: row.version,
                        decision: "create",
                        identity_verified: true,
                      });
                  }}
                >
                  Verify and register new patient
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    void run({
                      action: "review_intake",
                      intake_id: row.id,
                      expected_version: row.version,
                      decision: "reject",
                    })
                  }
                >
                  Decline request
                </Button>
              </div>
            </div>
          ))}
        </div>
        {!data.intakes.length && (
          <p className="mt-5 text-sm text-muted-foreground">No requests awaiting review.</p>
        )}
      </section>
      <section aria-label="Station services">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Kiosk services</h2>
          {can("organization.manage") && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void run({ action: "initialize" })}
              >
                Set up standard departments
              </Button>
              <Button type="button" onClick={() => setSelected(null)}>
                <Plus />
                Add department
              </Button>
            </div>
          )}
        </div>
        <div className="mt-4 divide-y divide-border">
          {data.departments.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <h3 className="font-medium">
                  {row.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    {row.prefix} · {row.kind}
                  </span>
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.active ? "Available" : "Unavailable"}
                  {row.kind === "consultation"
                    ? ` · ${row.duration} min · arrival ${row.early_minutes} min before / ${row.late_minutes} min after`
                    : " · No doctor required"}
                </p>
              </div>
              {can("organization.manage") && (
                <Button type="button" variant="outline" onClick={() => setSelected(row)}>
                  Edit {row.name}
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>
      {selected !== undefined && (
        <DepartmentDialog
          key={selected?.id ?? "new"}
          row={selected}
          onClose={() => setSelected(undefined)}
          run={run}
        />
      )}
      {stage && (
        <StageDialog
          key={stage.id}
          row={stage}
          departments={data.departments}
          providers={data.providers}
          onClose={() => setStage(null)}
          run={run}
        />
      )}
    </div>
  );
}
