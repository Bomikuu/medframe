"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSafety } from "@/features/workspace/safety-provider";
import { errorMessage } from "@/lib/auth/client";
import { stationRequest, type Device, type Transfer } from "./client";
import { TemporaryCode } from "./code-input";

type PairingStatus = "available" | "not_created" | "legacy" | "expired" | "used" | Device["state"];
type PairingDetails = {
  device: Device;
  transfer: Pick<Transfer, "code" | "expires_at"> | null;
  status: PairingStatus;
};
const statusCopy: Partial<Record<PairingStatus, { title: string; description: string }>> = {
  not_created: {
    title: "Ready to connect",
    description: "Generate a code, then enter it at /station on the receiving device.",
  },
  legacy: {
    title: "Earlier code can’t be redisplayed",
    description:
      "This code was created before saved-code display was available. Regenerate it once; future codes will appear here automatically.",
  },
  expired: {
    title: "Pairing code expired",
    description: "Generate a new code when the receiving device is ready.",
  },
  used: {
    title: "Code already used",
    description: "Review the connection in Manage before issuing another code.",
  },
  pending: {
    title: "Ready for your approval",
    description:
      "The receiving device entered its code. Open Manage, compare the verification phrase, then approve it.",
  },
  active: {
    title: "This device is already paired",
    description:
      "No pairing code is needed. Generate a new code only if you want to replace this connection.",
  },
  revoked: {
    title: "Device access is revoked",
    description: "Generate a new pairing code to reconnect and approve this device.",
  },
};

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
  const [transfer, setTransfer] = useState<PairingDetails["transfer"]>(null);
  const [status, setStatus] = useState<PairingStatus>(initial.state);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const epoch = useRef(0);
  const mutating = useRef(false);

  const load = useCallback(async () => {
    if (mutating.current) return;
    const request = ++epoch.current;
    try {
      const result = await stationRequest<PairingDetails>("manage", {
        organization_id: organizationId,
        device_id: initial.id,
        action: "current_code",
      });
      if (request !== epoch.current) return;
      setDevice(result.device);
      setTransfer(result.transfer);
      setStatus(result.status);
      setError("");
    } catch (cause) {
      if (request !== epoch.current) return;
      setTransfer(null);
      setError(errorMessage(cause));
    } finally {
      if (request === epoch.current) setLoading(false);
    }
  }, [initial.id, organizationId]);

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 10_000);
    return () => {
      epoch.current += 1;
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [load]);

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

    mutating.current = true;
    const request = ++epoch.current;
    setBusy(true);
    setError("");
    setTransfer(null);
    try {
      const result = await stationRequest<Transfer & { device: Device }>("manage", {
        organization_id: organizationId,
        device_id: device.id,
        expected_version: device.version,
        action: "pair",
      });
      if (request !== epoch.current) return;
      setDevice(result.device);
      setTransfer(result);
      setStatus("available");
      await onSaved();
    } catch (cause) {
      if (request === epoch.current) setError(errorMessage(cause));
    } finally {
      mutating.current = false;
      if (request === epoch.current) setBusy(false);
    }
  }

  const empty = statusCopy[status];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <header className="shrink-0 border-b border-border px-5 py-5 sm:px-6">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
            <KeyRound className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle>Pairing code</DialogTitle>
          <DialogDescription className="mt-1 pr-6">
            {device.name} · {device.branch}
          </DialogDescription>
        </header>
        <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {loading ? (
            <div aria-label="Loading pairing code" role="status" className="space-y-3 py-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : transfer ? (
            <TemporaryCode code={transfer.code} expiresAt={transfer.expires_at} />
          ) : !error && empty ? (
            <div className="rounded-xl bg-muted/60 p-5">
              <p className="font-semibold text-foreground">{empty.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{empty.description}</p>
            </div>
          ) : null}
          {error && (
            <div
              role="alert"
              className="space-y-3 rounded-xl border border-destructive/25 p-4 text-sm"
            >
              <p className="text-destructive">{error}</p>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void load()}>
                Retry loading code
              </Button>
            </div>
          )}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4" aria-hidden="true" /> Connect and approve
            </h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
              <li>
                Open <span className="font-medium text-foreground">/station</span> on the receiving
                device and enter the code.
              </li>
              <li>Open Manage and compare the verification phrase on both screens.</li>
              <li>Approve the device to finish pairing.</li>
            </ol>
          </div>
          <p className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            Pairing connects the physical device. Your doctor workspace code is managed separately.
          </p>
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 sm:px-6">
          <Button
            variant="ghost"
            disabled={busy || loading || !!error}
            onClick={() => void generate()}
          >
            <RefreshCw />
            {busy
              ? "Generating…"
              : transfer || status !== "not_created"
                ? "Regenerate code"
                : "Generate code"}
          </Button>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Done
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
