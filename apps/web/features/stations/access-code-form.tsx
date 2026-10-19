"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StationCode } from "./code-input";
import { stationRequest } from "./client";
import { errorMessage } from "@/lib/auth/client";

export function AccessCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function open() {
    setBusy(true);
    setError("");
    try {
      const result = await stationRequest<{ organization_id: string }>("doctor", { code });
      setCode("");
      // Full navigation clears any prior user's in-memory application cache.
      window.location.assign(`/station/clinician?organization=${result.organization_id}`);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }
  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void open();
      }}
    >
      <div>
        <h2 className="text-xl font-semibold">Open doctor workspace</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          On the doctor’s signed-in computer, open Station home and choose Connect my device. Enter
          their code here. No password or MFA prompt is needed on this tablet.
        </p>
      </div>
      <StationCode value={code} onChange={setCode} label="Clinician access code" disabled={busy} />
      <Button type="submit" disabled={busy || code.length !== 8} className="min-h-12">
        {busy ? "Opening workspace…" : "Open workspace"}
        <ArrowRight />
      </Button>
      <p className="flex gap-2 text-xs leading-5 text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <span>
          This code opens the doctor’s permitted patients and consultations in this branch for up to
          30 minutes. You can also start a walk-in and complete patient details before saving.
        </span>
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="button" variant="ghost" onClick={() => router.refresh()} disabled={busy}>
        Refresh device status
      </Button>
    </form>
  );
}
