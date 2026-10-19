"use client";

import { useState } from "react";
import { TabletSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FormSelect } from "@/features/patients/form-controls";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { errorMessage } from "@/lib/auth/client";
import { stationRequest, type Transfer } from "./client";
import { TemporaryCode } from "./code-input";

export function DoctorCodeDialog() {
  const { organizationId, workspace, overview } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [branch, setBranch] = useState(workspace.branches[0]?.id ?? "");
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function generate() {
    setBusy(true);
    setError("");
    setTransfer(null);
    try {
      setTransfer(
        await stationRequest<Transfer>("doctor", {
          action: "issue",
          organization_id: organizationId,
          branch_id: branch,
        }),
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setOpen(true);
          setTransfer(null);
          setError("");
        }}
      >
        <TabletSmartphone /> Connect my device
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Connect as {overview.currentUser.displayName}</DialogTitle>
          <DialogDescription>
            Generate your own one-use doctor code. On the paired, approved tablet, open Station and
            enter it to choose patients, continue consultations or start a walk-in.
          </DialogDescription>
          <FormSelect
            id="doctorCodeBranch"
            label="Clinic branch"
            value={branch}
            onChange={(value) => {
              setBranch(value);
              setTransfer(null);
            }}
            disabled={busy}
            options={workspace.branches.map((b) => ({ value: b.id, label: b.name }))}
          />
          {transfer && <TemporaryCode code={transfer.code} expiresAt={transfer.expires_at} />}
          <p className="text-xs leading-5 text-muted-foreground">
            Access lasts up to 30 minutes under your identity and existing patient permissions.
            Ending your source session or revoking the tablet ends its access. Keep the code
            private.
          </p>
          <Button disabled={busy || !branch} onClick={() => void generate()}>
            {busy
              ? "Generating…"
              : transfer
                ? "Replace unused doctor code"
                : "Generate doctor code"}
          </Button>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
