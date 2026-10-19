"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Monitor, ShieldCheck, SlidersHorizontal, Tablet, Tv } from "lucide-react";
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

const modeIcons = { clinician: Tablet, kiosk: Monitor, display: Tv };
const stateLabels = {
  setup: "Setup in progress",
  pending: "Awaiting approval",
  active: "Approved",
  revoked: "Access revoked",
};
const functionDescriptions: Record<string, string> = {
  "clinical.read": "Required for the clinician workspace.",
  "clinical.write": "Document and save consultations within staff permissions.",
  "billing.read": "Review bills permitted by the signed-in staff role.",
  "payments.record": "Requires the staff member’s existing billing permission.",
  booking: "Book available clinic appointments.",
  check_in: "Confirm arrival for an existing appointment.",
  walk_in: "Join the configured service queue.",
  payments: "Review bills and continue to the cashier.",
  "queue.display": "Queue display content is planned for a later phase.",
};

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
  const [strict, setStrict] = useState(initial?.strict_verification ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dirty =
    !device ||
    name !== device.name ||
    branch !== device.branch_id ||
    mode !== device.mode ||
    strict !== device.strict_verification ||
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
          device: { name, branch_id: branch, mode, functions, strict_verification: strict },
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
        latest.strict_verification !== device.strict_verification ||
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
  const ModeIcon = modeIcons[mode];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) void close();
      }}
    >
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <header className="shrink-0 border-b border-border px-5 py-5 sm:px-6">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <ModeIcon className="size-5" aria-hidden="true" />
            </span>
            {device && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {stateLabels[device.state]}
              </span>
            )}
          </div>
          <DialogTitle>{device ? "Manage device" : "Add clinic device"}</DialogTitle>
          <DialogDescription className="mt-1 pr-6">
            {device ? device.name : "Give your device a name and choose how it will be used."}
          </DialogDescription>
        </header>
        <form
          id="device-settings"
          className="min-h-0 space-y-6 overflow-y-auto px-5 py-5 sm:px-6"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <section className="space-y-4" aria-label="Device details">
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
                    next === "clinician"
                      ? ["clinical.read", "clinical.write"]
                      : modeFunctions[next],
                  );
                }}
                options={Object.entries(modeLabels).map(([value, label]) => ({ value, label }))}
              />
            </div>
          </section>
          <fieldset className="border-t border-border pt-5">
            <legend className="sr-only">Available functions</legend>
            <h3 className="mb-1 flex items-center gap-2 font-semibold">
              <SlidersHorizontal className="size-4" aria-hidden="true" /> Available functions
            </h3>
            <p className="mb-2 text-xs leading-5 text-muted-foreground">
              Enable what this device can do. Staff permissions still apply.
            </p>
            {modeFunctions[mode].map((value) => (
              <label
                key={value}
                className="flex min-h-16 cursor-pointer items-center justify-between gap-5 border-b border-border/60 py-3 text-sm last:border-0"
              >
                <span>
                  <span className="block font-medium">{functionLabels[value]}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {functionDescriptions[value]}
                  </span>
                </span>
                <Switch
                  checked={functions.includes(value)}
                  onCheckedChange={(checked) =>
                    setFunctions(
                      checked ? [...functions, value] : functions.filter((f) => f !== value),
                    )
                  }
                  disabled={mode === "clinician" && value === "clinical.read"}
                />
              </label>
            ))}
          </fieldset>
          {mode === "kiosk" && (
            <div className="grid gap-2 border-t border-border pt-4">
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-5 text-sm font-semibold">
                Strict patient verification
                <Switch checked={strict} onCheckedChange={setStrict} />
              </label>
              <p className="text-sm leading-6 text-muted-foreground">
                {strict
                  ? "Patients enter a new verification code before each task."
                  : "Reception selects the patient for this kiosk. No code is needed; one short session covers multiple tasks."}{" "}
                Changing this setting requires pairing the device again.
              </p>
            </div>
          )}
          {mode === "display" && (
            <p className="text-xs leading-5 text-muted-foreground">
              TV display workflows remain scheduled for a later Station phase.
            </p>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            Changing branch, purpose or functions ends existing access and requires pairing again.
            Renaming keeps the connection.
          </p>
          {device && (
            <section
              className="grid gap-4 border-t border-border pt-5"
              aria-label="Device connection"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="size-4" aria-hidden="true" /> Connection
                </h3>
                <span className="text-xs text-muted-foreground">{stateLabels[device.state]}</span>
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
        </form>
        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void close()}>
            Done
          </Button>
          <Button
            type="submit"
            form="device-settings"
            disabled={busy || !dirty || !name.trim() || !branch || !functions.length}
          >
            {busy ? "Working…" : device ? "Save changes" : "Create device"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
