"use client";

import { useEffect, useState, useCallback } from "react";
import { Monitor, Tablet, Tv, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety } from "@/features/workspace/safety-provider";
import { PageHeading } from "@/features/patients/feedback";
import { errorMessage } from "@/lib/auth/client";
import {
  functionLabels,
  modeFunctions,
  modeLabels,
  stationRequest,
  type Device,
  type Mode,
  type Transfer,
} from "./client";
import { TemporaryCode } from "./code-input";

type Setup = { devices: Device[]; branches: { id: string; name: string }[] };
const modeIcons = { clinician: Tablet, kiosk: Monitor, display: Tv };

export function DeviceManagement() {
  const { organizationId, can } = useWorkspace();
  const { confirm } = useSafety();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [mode, setMode] = useState<Mode>("clinician");
  const [functions, setFunctions] = useState(["clinical.read", "clinical.write"]);
  const refresh = useCallback(async () => {
    try {
      setSetup(await stationRequest<Setup>("manage", { organization_id: organizationId }));
      setError("");
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, [organizationId]);
  useEffect(() => {
    if (!can("organization.manage")) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, [can, refresh]);
  if (!can("organization.manage"))
    return <p role="alert">Clinic administration permission is required to manage devices.</p>;
  async function action(device: Device, action: string) {
    if (
      action !== "pair" &&
      !(await confirm({
        title: action === "revoke" ? `Revoke ${device.name}?` : `Approve ${device.name}?`,
        description:
          action === "revoke"
            ? "This immediately blocks this device’s clinic access. Its saved records remain intact."
            : `Compare verification phrase ${device.verification_phrase} on the physical device before approving. Pairing does not grant staff or patient access.`,
        action: action === "revoke" ? "Revoke device" : "Approve device",
      }))
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await stationRequest<Transfer>("manage", {
        action,
        organization_id: organizationId,
        device_id: device.id,
        expected_version: device.version,
      });
      if (action === "pair") setTransfer(result);
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    setBusy(true);
    setError("");
    try {
      await stationRequest("manage", {
        action: "create",
        organization_id: organizationId,
        device: { name, branch_id: branch || setup?.branches[0]?.id, mode, functions },
      });
      setOpen(false);
      setName("");
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-7">
      <PageHeading
        title="Devices & Stations"
        description="Give each clinic device a clear purpose. Keep every person’s access separate."
      >
        <ButtonLink href="/station" variant="outline">
          Open Station
        </ButtonLink>
        <Button onClick={() => setOpen(true)} disabled={!setup}>
          <Plus /> Add device
        </Button>
      </PageHeading>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 text-sm">
        <p className="max-w-2xl leading-6 text-muted-foreground">
          Generate a code, enter it on the receiving device, compare its verification phrase, then
          approve. Clinical access always requires a named staff account.
        </p>
        <Button variant="ghost" onClick={() => void refresh()} disabled={busy}>
          <RefreshCw /> Refresh
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!setup ? (
        <p role="status">Loading clinic devices…</p>
      ) : !setup.devices.length ? (
        <div className="py-12">
          <Tablet className="mb-5 size-10 text-primary" strokeWidth={1.3} />
          <h2 className="text-xl font-semibold">A focused workspace for every screen</h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Start with a clinician tablet to continue saved consultations. Kiosk and TV workflows
            are reserved for the next connected phases.
          </p>
          <Button className="mt-6" onClick={() => setOpen(true)}>
            Add your first device
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Purpose & functions</TableHead>
                <TableHead>Connection</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {setup.devices.map((device) => {
                const Icon = modeIcons[device.mode];
                return (
                  <TableRow key={device.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Icon className="size-5 shrink-0 text-primary" />
                        <div>
                          <p className="font-semibold">{device.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{device.branch}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p>{modeLabels[device.mode]}</p>
                      <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                        {device.functions.map((f) => functionLabels[f]).join(" · ")}
                      </p>
                      {device.mode !== "clinician" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Workflow available in a later phase
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">
                        {device.state === "pending" ? "Awaiting approval" : device.state}
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {device.last_seen_at
                          ? `Last contact ${new Date(device.last_seen_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : "No heartbeat yet"}
                      </p>
                      {device.state === "pending" && (
                        <p className="mt-2 font-semibold tracking-wider">
                          {device.verification_phrase}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {device.state === "pending" && (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => void action(device, "approve")}
                          >
                            Approve
                          </Button>
                        )}
                        {["setup", "revoked"].includes(device.state) && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void action(device, "pair")}
                          >
                            Pair device
                          </Button>
                        )}
                        {device.state !== "revoked" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => void action(device, "revoke")}
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogTitle>Add clinic device</DialogTitle>
          <DialogDescription>
            Choose its branch and permitted functions. Pairing and physical approval happen next.
          </DialogDescription>
          <form
            className="mt-3 grid gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <FormField id="station-name" label="Device name">
              <Input
                id="station-name"
                required
                maxLength={80}
                placeholder="Consultation room tablet"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormField>
            <FormSelect
              id="station-branch"
              label="Branch"
              value={branch || setup?.branches[0]?.id || ""}
              onChange={setBranch}
              options={setup?.branches.map((b) => ({ value: b.id, label: b.name })) || []}
            />
            <FormSelect
              id="station-mode"
              label="Device purpose"
              value={mode}
              onChange={(next) => {
                const m = next as Mode;
                setMode(m);
                setFunctions(
                  modeFunctions[m].filter((f) => !["billing.read", "payments.record"].includes(f)),
                );
              }}
              options={Object.entries(modeLabels).map(([value, label]) => ({ value, label }))}
            />
            <fieldset className="grid gap-3">
              <legend className="mb-3 text-sm font-medium">Permitted functions</legend>
              {modeFunctions[mode].map((f) => (
                <label key={f} className="flex min-h-10 items-center gap-3 text-sm">
                  <Checkbox
                    checked={functions.includes(f)}
                    onCheckedChange={(checked) =>
                      setFunctions((list) => (checked ? [...list, f] : list.filter((v) => v !== f)))
                    }
                  />
                  {functionLabels[f]}
                </label>
              ))}
            </fieldset>
            {mode !== "clinician" && (
              <p className="text-sm text-muted-foreground">
                You can pair and revoke this device now. Patient self-service and live TV content
                are enabled in later phases.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || !name.trim() || !functions.length}>
              Create device
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!transfer}
        onOpenChange={(next) => {
          if (!next) setTransfer(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Pair the receiving device</DialogTitle>
          <DialogDescription>
            Open /station on that device and enter this code. Then compare its verification phrase
            before approving here.
          </DialogDescription>
          {transfer && <TemporaryCode code={transfer.code} expiresAt={transfer.expires_at} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
