"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { requestWithCsrf, errorMessage } from "@/lib/auth/client";
import { usePortal } from "@/features/portal/portal-provider";

export function PortalKioskCode() {
  const { linkId } = usePortal();
  const [proof, setProof] = useState<{ code: string; expires_at: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!proof) return;
    const timer = window.setTimeout(
      () => setProof(null),
      Math.max(0, new Date(proof.expires_at).getTime() - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [proof]);
  async function issue() {
    setBusy(true);
    setError("");
    try {
      setProof(await requestWithCsrf("portal/kiosk-code", { link_id: linkId }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <Button type="button" variant="outline" disabled={busy} onClick={() => void issue()}>
        Get a strict-mode kiosk code
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Dialog
        open={!!proof}
        onOpenChange={(open) => {
          if (!open) setProof(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Strict-mode kiosk verification</DialogTitle>
          <DialogDescription>
            Use this code only if the clinic’s kiosk is in strict mode. Standard kiosks are opened
            by reception without a code. This code expires in five minutes; keep it private.
          </DialogDescription>
          <p className="rounded-lg bg-muted px-4 py-6 text-center text-2xl font-semibold tracking-[0.2em] select-all">
            {proof?.code}
          </p>
          <p className="text-xs text-muted-foreground">
            This verifies your selected patient connection, not a staff login or device setup.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
