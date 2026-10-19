"use client";

import {
  Clock3,
  KeyRound,
  MapPin,
  Monitor,
  Settings2,
  ShieldCheck,
  Tablet,
  Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { functionLabels, modeLabels, type Device } from "./client";

const modeIcons = { clinician: Tablet, kiosk: Monitor, display: Tv };
const states = {
  active: {
    label: "Approved",
    color: "bg-success-soft text-success",
    detail: "Access follows this device’s enabled functions.",
  },
  pending: {
    label: "Awaiting approval",
    color: "bg-warning-soft text-warning",
    detail: "Compare the verification phrase in Manage, then approve.",
  },
  setup: {
    label: "Setup in progress",
    color: "bg-info-soft text-info",
    detail: "Generate a pairing code to connect the receiving device.",
  },
  revoked: {
    label: "Access revoked",
    color: "bg-danger-soft text-destructive",
    detail: "Generate a new pairing code to reconnect this device.",
  },
};
const shortFunctions: Record<string, string> = {
  "clinical.read": "Clinical records",
  "clinical.write": "Consultations",
  "billing.read": "Billing",
  "payments.record": "Payment records",
  booking: "Appointments",
  check_in: "Check-in",
  walk_in: "Walk-in queue",
  payments: "Cashier",
  "queue.display": "Queue numbers",
};

export function DeviceCard({
  device,
  timezone,
  onManage,
  onPair,
}: {
  device: Device;
  timezone: string;
  onManage: () => void;
  onPair: () => void;
}) {
  const Icon = modeIcons[device.mode];
  const status = states[device.state];
  return (
    <article
      aria-labelledby={`device-${device.id}`}
      className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/25 sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
          <Icon className="size-5" strokeWidth={1.7} aria-hidden="true" />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
            status.color,
          )}
        >
          <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
          {status.label}
        </span>
      </div>
      <h2 id={`device-${device.id}`} className="text-lg leading-7 font-semibold wrap-anywhere">
        <button
          type="button"
          className="rounded-sm text-left underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          onClick={onManage}
        >
          {device.name}
        </button>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{modeLabels[device.mode]}</p>
      <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {device.branch}
      </p>
      <ul aria-label="Enabled functions" className="mt-4 flex flex-wrap gap-1.5">
        {device.functions.map((value) => (
          <li
            key={value}
            title={functionLabels[value]}
            className="rounded-md bg-muted/70 px-2.5 py-1 text-xs leading-5 text-muted-foreground"
          >
            {shortFunctions[value] ?? functionLabels[value] ?? value}
          </li>
        ))}
      </ul>
      <div className="mt-5 mb-5 grid flex-1 content-start gap-3 border-y border-border py-4">
        <div className="flex gap-2.5">
          <ShieldCheck
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-xs leading-5 text-muted-foreground">{status.detail}</p>
        </div>
        <div className="flex gap-2.5">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="text-xs leading-5">
            <p className="font-medium">Last contact</p>
            <p className="mt-0.5 text-muted-foreground">
              {device.last_seen_at
                ? new Intl.DateTimeFormat("en-PH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: timezone,
                  }).format(new Date(device.last_seen_at))
                : "No contact recorded yet"}
            </p>
          </div>
        </div>
        {device.mode === "kiosk" && (
          <p className="text-xs leading-5 text-muted-foreground">
            {device.strict_verification
              ? "Strict mode · code for each patient task"
              : "Standard mode · reception opens the patient session"}
          </p>
        )}
        {device.mode === "display" && (
          <p className="text-xs leading-5 text-muted-foreground">
            Queue-display content is planned for a later Station phase.
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={device.state === "pending" ? "default" : "outline"}
          className="min-h-11"
          onClick={onManage}
          aria-label={`Manage ${device.name}`}
        >
          <Settings2 /> {device.state === "pending" ? "Review" : "Manage"}
        </Button>
        <Button
          variant={device.state === "setup" ? "default" : "outline"}
          className="min-h-11"
          onClick={onPair}
          aria-label={`Pairing code for ${device.name}`}
        >
          <KeyRound /> Pairing code
        </Button>
      </div>
    </article>
  );
}
