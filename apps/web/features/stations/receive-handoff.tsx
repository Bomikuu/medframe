"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StationCode } from "./code-input";
import { stationRequest, type HandoffPreview } from "./client";
import { errorMessage } from "@/lib/auth/client";
import { useSafety } from "@/features/workspace/safety-provider";

export function ReceiveHandoff() {
  const router = useRouter();
  const { guard } = useSafety();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<HandoffPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function act(accept = false) {
    setBusy(true);
    setError("");
    try {
      if (accept) {
        const result = await stationRequest<{ encounter_id: string; organization_id: string }>(
          "handoff",
          { action: "accept", code },
        );
        setCode("");
        setPreview(null);
        router.push(
          `/station/clinician/consultations/${result.encounter_id}?organization=${result.organization_id}`,
        );
      } else
        setPreview(await stationRequest<HandoffPreview>("handoff", { action: "preview", code }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="grid gap-5 rounded-xl border border-border bg-card p-5 sm:p-7"
      aria-label="Receive a handoff"
    >
      <div>
        <h2 className="text-xl font-semibold">Receive a handoff</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Enter the temporary code from the current editing device. Review before accepting control.
        </p>
      </div>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void act();
        }}
      >
        <StationCode
          value={code}
          onChange={(value) => {
            setCode(value);
            setPreview(null);
          }}
          label="Handoff code"
          disabled={busy}
        />
        <Button type="submit" variant="outline" disabled={busy || code.length !== 8}>
          Review handoff
        </Button>
      </form>
      {preview && (
        <div className="grid gap-4 border-t border-border pt-5">
          <div>
            <h3 className="text-lg font-semibold">{preview.patient}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{preview.reason}</p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
            <dt className="text-muted-foreground">From</dt>
            <dd>{preview.sender}</dd>
            <dt className="text-muted-foreground">To</dt>
            <dd>{preview.recipient}</dd>
            <dt className="text-muted-foreground">Saved version</dt>
            <dd>{preview.version}</dd>
          </dl>
          {preview.summary && (
            <p className="text-sm leading-6 whitespace-pre-wrap">{preview.summary}</p>
          )}
          {preview.tasks && (
            <div>
              <h4 className="text-sm font-semibold">Outstanding tasks</h4>
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">{preview.tasks}</p>
            </div>
          )}
          <p className="text-sm leading-6 text-muted-foreground">
            {preview.kind === "device"
              ? "This moves editing control. Clinical responsibility stays with the same clinician."
              : "Accepting makes you the responsible provider on this unfinished consultation."}{" "}
            The previous device becomes read-only.
          </p>
          <Button disabled={busy} onClick={() => void guard(() => void act(true))}>
            {busy ? "Accepting…" : "Accept handoff"}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
