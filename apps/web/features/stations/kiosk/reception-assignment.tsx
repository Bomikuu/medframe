"use client";

import { useState } from "react";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/features/patients/form-controls";

export type ReceptionKiosk = {
  id: string;
  name: string;
  version: number;
  generation: number;
  strict_verification: boolean;
  occupied: boolean;
};

export function ReceptionAssignment({
  kiosks,
  patient,
  verified,
  busy,
  run,
}: {
  kiosks: ReceptionKiosk[];
  patient: string;
  verified: boolean;
  busy: boolean;
  run: (body: Record<string, unknown>) => Promise<unknown>;
}) {
  const [deviceId, setDeviceId] = useState("");
  const [notice, setNotice] = useState("");
  const device = kiosks.find((item) => item.id === deviceId);
  const available = kiosks.filter((item) => !item.strict_verification && !item.occupied);

  async function send() {
    if (!device || !patient || !verified) return;
    setNotice("");
    const result = await run({
      action: "assign",
      patient_id: patient,
      device_id: device.id,
      device_version: device.version,
      generation: device.generation,
      method: "in_person_identity_verified",
    });
    if (result) {
      setNotice(
        `Sent to ${device.name}. The patient can continue there without a code. The handoff expires in two minutes if not opened.`,
      );
      setDeviceId("");
    }
  }

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4">
      <FormSelect
        id="reception-kiosk"
        label="Receiving kiosk"
        value={deviceId}
        onChange={(value) => {
          setDeviceId(value);
          setNotice("");
        }}
        options={available.map((item) => ({ value: item.id, label: item.name }))}
        disabled={busy || !available.length}
      />
      {!available.length && (
        <p className="text-sm leading-6 text-muted-foreground">
          No idle standard-mode kiosk is available. Open the receiving kiosk at /station/kiosk,
          finish any previous patient session, or check its device approval and mode.
        </p>
      )}
      <Button
        type="button"
        className="min-h-11 justify-self-start"
        disabled={
          busy || !verified || !patient || !device || device.occupied || device.strict_verification
        }
        onClick={() => void send()}
      >
        <Monitor /> Send patient to kiosk
      </Button>
      {notice && (
        <p role="status" className="text-sm leading-6 text-teal-ink">
          {notice}
        </p>
      )}
    </div>
  );
}
