"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  RefreshCw,
  Plus,
  MapPin,
  Monitor,
  UsersRound,
  ListOrdered,
  Layers3,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { FormSelect } from "@/features/patients/form-controls";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useOperationsSetup } from "@/features/operations/use-operations";
import { DepartmentOverview, DepartmentServices } from "./department-overview";
import { RegistrationRequests, type Intake } from "./registration-requests";
import { BranchChoice } from "@/features/operations/controls";
import { LoadState, PageHeading } from "@/features/patients/feedback";
import { stationRequest } from "../client";
import { errorMessage } from "@/lib/auth/client";
import { DepartmentDialog, StageDialog, type StaffTicket } from "./staff-dialogs";
import type { ReceptionKiosk } from "./reception-assignment";
import { PatientAccessPanel, type VerifiedPatient } from "./patient-access-panel";
import { clinicTime, type Department, type Provider } from "./types";

type Data = {
  departments: Department[];
  providers: Provider[];
  tickets: StaffTicket[];
  intakes: Intake[];
  timezone: string;
  kiosks: ReceptionKiosk[];
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
          <UsersRound /> Consultation queue
        </ButtonLink>
        {can("organization.manage") && (
          <ButtonLink href={href("/clinic/settings/stations")}>
            <Monitor /> Devices & Stations
          </ButtonLink>
        )}
      </PageHeading>
      <StaffBoard
        key={remote.setup.branch_id}
        branch={remote.setup.branch_id}
        branchControl={<BranchChoice setup={remote.setup} change={setBranch} />}
      />
    </div>
  );
}
function StaffBoard({ branch, branchControl }: { branch: string; branchControl: ReactNode }) {
  const { organizationId, can } = useWorkspace();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Department | null | undefined>(undefined);
  const [stage, setStage] = useState<StaffTicket | null>(null);
  const [selection, setSelection] = useState<VerifiedPatient>({ patient: "", verified: false });
  const [filter, setFilter] = useState("all");
  const [showTickets, setShowTickets] = useState(false);
  const queueDetails = useRef<HTMLDivElement>(null);
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
  if (!data) return <LoadState error={error} retry={() => void refresh()} />;
  const tickets = data.tickets.filter((item) => filter === "all" || item.department_id === filter);
  return (
    <div className="grid min-w-0 gap-5">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <section
          aria-label="Clinic branch"
          className="rounded-xl border border-border bg-card p-5 sm:p-6"
        >
          <div className="mb-5 flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
              <MapPin className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Clinic branch</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Select the branch to view patient stations and department queues.
              </p>
            </div>
          </div>
          {branchControl}
        </section>
        <PatientAccessPanel
          kiosks={data.kiosks}
          timezone={data.timezone}
          busy={busy}
          run={run}
          selection={selection}
          onSelectionChange={setSelection}
        />
      </div>
      <section
        aria-label="Department queues"
        className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-3 text-base font-semibold">
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <ListOrdered className="size-5" aria-hidden="true" />
              </span>
              Today’s department queues
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              One visit across services. Counts use up to 200 permitted tickets; wait estimates are
              unavailable.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
            <div className="min-w-44 flex-1">
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
            <Button type="button" variant="outline" disabled={busy} onClick={() => void refresh()}>
              <RefreshCw />
              Refresh
            </Button>
          </div>
        </div>
        <DepartmentOverview
          departments={data.departments.filter((item) => filter === "all" || item.id === filter)}
          tickets={data.tickets}
          onView={(id) => {
            setFilter(id);
            setShowTickets(true);
            window.setTimeout(() => {
              queueDetails.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              queueDetails.current?.focus({ preventScroll: true });
            }, 0);
          }}
        />
        {!data.departments.length && (
          <p className="py-8 text-sm leading-6 text-muted-foreground">
            No departments configured. Clinic administrators can add a service below.
          </p>
        )}
        {showTickets && (
          <div
            ref={queueDetails}
            tabIndex={-1}
            className="mt-6 min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">
                {filter === "all"
                  ? "All department tickets"
                  : `${data.departments.find((item) => item.id === filter)?.name ?? "Department"} tickets`}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowTickets(false)}>
                <X />
                Hide tickets
              </Button>
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
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.patient_reference}
                        </p>
                      </td>
                      <td className="px-3 py-4 capitalize">
                        {row.status.replaceAll("_", " ")}
                        {row.priority && (
                          <span className="ml-2 text-xs font-semibold text-amber-800">
                            Priority
                          </span>
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
              <p className="py-8 text-sm text-muted-foreground">
                No tickets in this department today.
              </p>
            )}
          </div>
        )}
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <RegistrationRequests
          intakes={data.intakes}
          busy={busy}
          verified={selection.verified}
          patient={selection.patient}
          run={run}
        />
        <section
          aria-label="Station services"
          className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <Layers3 className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold">Kiosk services</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Manage services available on patient kiosks.
                </p>
              </div>
            </div>
            {can("organization.manage") && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => setSelected(null)}>
                  <Plus />
                  Add department
                </Button>
              </div>
            )}
          </div>
          <DepartmentServices
            departments={data.departments}
            canManage={can("organization.manage")}
            onEdit={setSelected}
          />
          {can("organization.manage") && (
            <details className="mt-3 border-t border-border pt-4">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Standard department setup
              </summary>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Add the standard Consultation, Laboratory and Cashier departments if their prefixes
                are not already configured.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                disabled={busy}
                onClick={() => void run({ action: "initialize" })}
              >
                Set up standard departments
              </Button>
            </details>
          )}
        </section>
      </div>
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
