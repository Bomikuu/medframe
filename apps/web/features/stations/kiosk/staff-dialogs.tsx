"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FormSelect } from "@/features/patients/form-controls";
import type { Department, Provider, Ticket } from "./types";
export type StaffTicket = Ticket & {
  patient: string;
  patient_reference: string;
  visit_state: string;
};
export type ManageAction = (data: Record<string, unknown>) => Promise<unknown>;

export function DepartmentDialog({
  row,
  onClose,
  run,
}: {
  row: Department | null;
  onClose: () => void;
  run: ManageAction;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [prefix, setPrefix] = useState(row?.prefix ?? "");
  const [kind, setKind] = useState(row?.kind ?? "other");
  const [duration, setDuration] = useState(row?.duration ?? 30);
  const [early, setEarly] = useState(row?.early_minutes ?? 60);
  const [late, setLate] = useState(row?.late_minutes ?? 120);
  const [active, setActive] = useState(row?.active ?? true);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>{row ? "Edit department" : "Add department"}</DialogTitle>
        <DialogDescription>
          Configure service names, ticket prefixes and consultation arrival rules.
        </DialogDescription>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            setBusy(true);
            void run({
              action: "department",
              ...(row ? { id: row.id, expected_version: row.version } : {}),
              name,
              prefix,
              kind,
              duration,
              early_minutes: early,
              late_minutes: late,
              active,
            })
              .then((result) => {
                if (result) onClose();
              })
              .finally(() => setBusy(false));
          }}
        >
          <FormField id="department-name" label="Department name">
            <Input
              id="department-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField id="department-prefix" label="Ticket prefix">
              <Input
                id="department-prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                pattern="[A-Z]{1,4}"
                maxLength={4}
                required
              />
            </FormField>
            <FormSelect
              id="department-kind"
              label="Service type"
              value={kind}
              onChange={setKind}
              options={["consultation", "laboratory", "cashier", "other"].map((value) => ({
                value,
                label: value,
              }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                id: "department-duration",
                label: "Duration (min)",
                value: duration,
                set: setDuration,
                max: 240,
              },
              {
                id: "department-early",
                label: "Early arrival (min)",
                value: early,
                set: setEarly,
                max: 240,
              },
              {
                id: "department-late",
                label: "Late arrival (min)",
                value: late,
                set: setLate,
                max: 480,
              },
            ].map((item) => (
              <FormField key={item.id} id={item.id} label={item.label}>
                <Input
                  id={item.id}
                  type="number"
                  min={item.id === "department-duration" ? 5 : 0}
                  max={item.max}
                  value={item.value}
                  onChange={(e) => item.set(Number(e.target.value))}
                  required
                />
              </FormField>
            ))}
          </div>
          <label className="flex min-h-11 items-center gap-3">
            <Checkbox checked={active} onCheckedChange={(value) => setActive(value === true)} />
            Available to kiosks
          </label>
          <Button type="submit" disabled={busy}>
            Save department
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function StageDialog({
  row,
  departments,
  providers,
  onClose,
  run,
}: {
  row: StaffTicket;
  departments: Department[];
  providers: Provider[];
  onClose: () => void;
  run: ManageAction;
}) {
  const [target, setTarget] = useState(
    ["waiting", "called"].includes(row.status)
      ? "called"
      : row.status === "in_service"
        ? "completed"
        : "transfer",
  );
  const [reason, setReason] = useState("");
  const [department, setDepartment] = useState("");
  const [provider, setProvider] = useState("");
  const [busy, setBusy] = useState(false);
  const destination = departments.find((item) => item.id === department);
  const options =
    row.status === "waiting"
      ? ["called", "priority", "skipped", "cancelled", "transfer"]
      : row.status === "called"
        ? ["called", "waiting", "in_service", "priority", "skipped", "cancelled", "transfer"]
        : row.status === "in_service"
          ? ["completed", "transfer"]
          : ["transfer"];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>
          {row.label} · {row.patient}
        </DialogTitle>
        <DialogDescription>
          {row.department} · {row.status.replaceAll("_", " ")} · {row.patient_reference}
        </DialogDescription>
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            void run({
              action: "stage",
              stage_id: row.id,
              expected_version: row.version,
              target,
              reason,
              department_id: department,
              provider_id: provider,
            })
              .then((result) => {
                if (result) onClose();
              })
              .finally(() => setBusy(false));
          }}
        >
          <FormSelect
            id="stage-action"
            label="Queue action"
            value={options.includes(target) ? target : "transfer"}
            onChange={setTarget}
            options={options.map((value) => ({
              value,
              label:
                value === "called" && row.status === "called"
                  ? "Recall"
                  : value === "priority"
                    ? row.priority
                      ? "Remove priority"
                      : "Mark priority"
                    : value.replaceAll("_", " "),
            }))}
          />
          {target === "transfer" && (
            <>
              <FormSelect
                id="stage-department"
                label="Transfer to"
                value={department}
                onChange={setDepartment}
                options={departments
                  .filter((item) => item.active && item.id !== row.department_id)
                  .map((item) => ({ value: item.id, label: item.name }))}
              />
              {destination?.kind === "consultation" && (
                <FormSelect
                  id="stage-provider"
                  label="Responsible provider"
                  value={provider}
                  onChange={setProvider}
                  options={providers.map((item) => ({ value: item.id, label: item.name }))}
                />
              )}
            </>
          )}
          <FormField id="stage-reason" label="Operational reason">
            <Input
              id="stage-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={240}
              required={["skipped", "cancelled", "priority", "transfer", "waiting"].includes(
                target,
              )}
            />
          </FormField>
          <p className="text-xs leading-5 text-muted-foreground">
            Transfer keeps the same visit. Consultation service uses the existing clinical queue;
            completing a queue stage does not finalize clinical notes.
          </p>
          <Button type="submit" disabled={busy}>
            Confirm action
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
