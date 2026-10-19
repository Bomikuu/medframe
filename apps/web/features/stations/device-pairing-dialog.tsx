"use client";

import { useState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useSafety } from "@/features/workspace/safety-provider";
import { errorMessage } from "@/lib/auth/client";
import { stationRequest, type Device, type Transfer } from "./client";
import { TemporaryCode } from "./code-input";

export function DevicePairingDialog({
  device: initial,
  organizationId,
  onClose,
  onSaved,
}: {
  device: Device;
  organizationId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { confirm } = useSafety();
  const [device, setDevice] = useState(initial);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (
      !(await confirm({
        title: "Generate a new pairing code?",
        description:
          "This ends the device’s current access and replaces any unused pairing code. Enter the new code on the receiving device, then approve it in Manage.",
        action: "Generate new code",
      }))
    )
      return;

    setBusy(true);
    setError("");
    // Clear a previously displayed secret before requesting its replacement.
    setTransfer(null);
    try {
      const result = await stationRequest<Transfer & { device: Device }>("manage", {
        organization_id: organizationId,
        device_id: device.id,
        expected_version: device.version,
        action: "pair",
      });
      setDevice(result.device);
      setTransfer(result);
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
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-primary">
          <KeyRound className="size-5" aria-hidden="true" />
        </div>
        <DialogTitle>Pairing code</DialogTitle>
        <DialogDescription>
          Connect {device.name} at {device.branch}. This code pairs the physical device; a doctor’s
          workspace access code is managed separately.
        </DialogDescription>
        {transfer ? (
          <TemporaryCode code={transfer.code} expiresAt={transfer.expires_at} />
        ) : (
          <p className="rounded-xl border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">
            Generate a single-use code when the receiving device is ready. Previously generated
            codes cannot be retrieved after closing this window.
          </p>
        )}
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          <li>Open /station on the receiving device and enter the pairing code.</li>
          <li>Return to Manage, refresh the connection and compare the verification phrase.</li>
          <li>Approve the device to finish pairing.</li>
        </ol>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error} Close and reopen Pairing code if the device has changed.
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Close
          </Button>
          <Button disabled={busy} onClick={() => void generate()}>
            {transfer ? <RefreshCw /> : <KeyRound />}
            {busy ? "Generating…" : transfer ? "Regenerate code" : "Generate code"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
