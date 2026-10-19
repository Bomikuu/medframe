"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { useSafety } from "@/features/workspace/safety-provider";
import { errorMessage } from "@/lib/auth/client";
import {
  functionLabels,
  modeFunctions,
  modeLabels,
  stationRequest,
  type Device,
  type Mode,
} from "./client";

type Branch = { id: string; name: string };
export function DeviceDialog({
  device: initial,
  branches,
  organizationId,
  onClose,
  onSaved,
}: {
  device: Device | null;
  branches: Branch[];
  organizationId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { confirm } = useSafety();
  const [device, setDevice] = useState(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [branch, setBranch] = useState(initial?.branch_id ?? branches[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>(initial?.mode ?? "clinician");
  const [functions, setFunctions] = useState(
    initial?.functions ?? ["clinical.read", "clinical.write"],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dirty =
    !device ||
    name !== device.name ||
    branch !== device.branch_id ||
    mode !== device.mode ||
    JSON.stringify([...functions].sort()) !== JSON.stringify([...device.functions].sort());
  async function close() {
    if (
      dirty &&
      !(await confirm({
        title: "Discard device changes?",
        description: "Your device settings have not been saved.",
        action: "Discard changes",
      }))
    )
      return;
    onClose();
  }
  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await stationRequest<{ device: Device; pairing_required?: boolean }>(
        "manage",
        {
          organization_id: organizationId,
          action: device ? "update" : "create",
          device_id: device?.id,
          expected_version: device?.version,
          device: { name, branch_id: branch, mode, functions },
        },
      );
      setDevice(result.device);
      setNotice(
        result.pairing_required
          ? "Settings saved. Open Pairing code from the device list to connect this device again."
          : "Device settings saved.",
      );
      await onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function refreshConnection() {
    if (!device) return;
    setBusy(true);
    setError("");
    try {
      const result = await stationRequest<{ devices: Device[] }>("manage", {
        organization_id: organizationId,
      });
      const latest = result.devices.find((item) => item.id === device.id);
      if (
        !latest ||
        latest.name !== device.name ||
        latest.branch_id !== device.branch_id ||
        latest.mode !== device.mode ||
        JSON.stringify(latest.functions) !== JSON.stringify(device.functions)
      ) {
        throw new Error(
          "Device settings changed elsewhere. Close and reopen this device to review them.",
        );
      }
      setDevice(latest);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function manage(action: "approve" | "revoke") {
    if (!device) return;
    const descriptions = {
      approve: `Compare verification phrase ${device.verification_phrase ?? "on the receiving screen"} with the physical device before approving.`,
      revoke: "This immediately ends access on this device. Saved patient records remain intact.",
    };
    if (
      !(await confirm({
        title: action === "approve" ? "Approve this device?" : "Revoke this device?",
        description: descriptions[action],
        action: action === "approve" ? "Approve device" : "Revoke device",
      }))
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await stationRequest<{ device: Device }>("manage", {
        organization_id: organizationId,
        device_id: device.id,
        expected_version: device.version,
        action,
      });
      setDevice(result.device);
      setNotice(
        action === "approve" ? "Device approved." : action === "revoke" ? "Device revoked." : "",
      );
      await onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) void close();
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogTitle>{device ? "Manage device" : "Add clinic device"}</DialogTitle>
        <DialogDescription>
          Edit device settings and manage access. Generate pairing codes separately from the device
          list.
        </DialogDescription>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <FormField id="deviceName" label="Device name">
            <Input
              id="deviceName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              id="deviceBranch"
              label="Branch"
              value={branch}
              onChange={setBranch}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
            <FormSelect
              id="deviceMode"
              label="Device purpose"
              value={mode}
              onChange={(value) => {
                const next = value as Mode;
                setMode(next);
                setFunctions(
                  next === "clinician" ? ["clinical.read", "clinical.write"] : modeFunctions[next],
                );
              }}
              options={Object.entries(modeLabels).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <fieldset className="grid gap-3">
            <legend className="mb-3 text-sm font-semibold">Available functions</legend>
            {modeFunctions[mode].map((value) => (
              <label key={value} className="flex min-h-10 items-center gap-3 text-sm">
                <Checkbox
                  checked={functions.includes(value)}
                  onCheckedChange={(checked) =>
                    setFunctions(
                      checked ? [...functions, value] : functions.filter((f) => f !== value),
                    )
                  }
                  disabled={mode === "clinician" && value === "clinical.read"}
                />
                {functionLabels[value]}
              </label>
            ))}
          </fieldset>
          {mode === "display" && (
            <p className="text-xs leading-5 text-muted-foreground">
              TV display workflows remain scheduled for a later Station phase.
            </p>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            Changing branch, purpose or functions ends existing access and requires pairing again.
            Renaming keeps the connection.
          </p>
          <Button
            disabled={busy || !dirty || !name.trim() || !branch || !functions.length}
            className="justify-self-start"
          >
            {busy ? "Working…" : device ? "Save changes" : "Create device"}
          </Button>
        </form>
        {device && (
          <section
            className="grid gap-4 border-t border-border pt-5"
            aria-label="Device connection"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Connection</h3>
              <span className="text-sm capitalize">
                {device.state === "pending" ? "Awaiting approval" : device.state}
              </span>
            </div>
            {device.state === "pending" && (
              <p className="rounded-lg bg-muted p-4 text-center font-mono text-xl tracking-widest">
                {device.verification_phrase ??
                  "Refresh the device list to see its verification phrase."}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={busy || dirty}
                onClick={() => void refreshConnection()}
              >
                Refresh connection
              </Button>
              {device.state === "pending" && (
                <Button
                  type="button"
                  disabled={busy || dirty}
                  onClick={() => void manage("approve")}
                >
                  Approve device
                </Button>
              )}
              {device.state !== "revoked" && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy || dirty}
                  onClick={() => void manage("revoke")}
                >
                  Revoke device
                </Button>
              )}
            </div>
            {dirty && (
              <p className="text-xs text-muted-foreground">
                Save your changes before changing the connection.
              </p>
            )}
          </section>
        )}
        {notice && (
          <p role="status" className="text-sm text-teal-ink">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error} Close and reopen the device if its version has changed.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
