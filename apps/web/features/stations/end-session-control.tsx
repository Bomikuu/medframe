"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useSafety } from "@/features/workspace/safety-provider";
import { errorMessage, requestWithCsrf } from "@/lib/auth/client";
export function EndSessionControl() {
  const { clearDirty } = useSafety();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function end() {
    setBusy(true);
    setError("");
    try {
      await requestWithCsrf("auth/logout", {});
      clearDirty();
      window.location.replace("/station");
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="min-h-10"
        onClick={() => {
          setOpen(true);
          setError("");
        }}
      >
        <LogOut className="size-3.5" /> End session
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <AlertDialogContent className="z-[170]" overlayClassName="z-[160]">
          <AlertDialogTitle>End this Station session?</AlertDialogTitle>
          <AlertDialogDescription>
            Saved patient records will remain. Unsaved notes, chart changes and walk-in details on
            this device will be lost. You will need a new doctor code to return. Ending an issuing
            workstation session also ends its connected tablet sessions.
          </AlertDialogDescription>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep working</AlertDialogCancel>
            <Button type="button" disabled={busy} onClick={() => void end()}>
              {busy ? "Ending session…" : "Confirm end session"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
