"use client";

import { useEffect, useState, useCallback } from "react";
import { Monitor, Tablet, Tv, Plus, RefreshCw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { PageHeading } from "@/features/patients/feedback";
import { errorMessage } from "@/lib/auth/client";
import { functionLabels, modeLabels, stationRequest, type Device } from "./client";
import { DeviceDialog } from "./device-dialog";

type Setup = { devices: Device[]; branches: { id: string; name: string }[] };
const modeIcons = { clinician: Tablet, kiosk: Monitor, display: Tv };
export function DeviceManagement() {
  const { organizationId, can, href } = useWorkspace();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Device | null | undefined>(undefined);
  const refresh = useCallback(async () => {
    try {
      setSetup(await stationRequest<Setup>("manage", { organization_id: organizationId }));
      setError("");
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, [organizationId]);
  useEffect(() => {
    if (!can("organization.manage")) return;
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [can, refresh]);
  if (!can("organization.manage"))
    return <p role="alert">Clinic administration permission is required to manage devices.</p>;
  return (
    <div className="grid gap-7">
      <PageHeading
        title="Devices & Stations"
        description="Open a device to edit its settings, pair it again or manage access."
      >
        <ButtonLink href={href("/station/clinician")} variant="outline">
          Doctor workspace & code
        </ButtonLink>
        <Button onClick={() => setSelected(null)} disabled={!setup}>
          <Plus /> Add device
        </Button>
      </PageHeading>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 text-sm">
        <p className="max-w-2xl leading-6 text-muted-foreground">
          Pair a physical device here. The doctor then generates their own access code from Station
          home to open their permitted clinical workspace.
        </p>
        <Button variant="ghost" onClick={() => void refresh()}>
          <RefreshCw /> Refresh
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!setup ? (
        <p role="status">Loading clinic devices…</p>
      ) : !setup.devices.length ? (
        <div className="py-12">
          <Tablet className="mb-5 size-10 text-primary" />
          <h2 className="text-xl font-semibold">Connect your first clinic device</h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Create a clinician tablet, generate its pairing code, then approve the receiving device.
          </p>
          <Button className="mt-6" onClick={() => setSelected(null)}>
            Add device
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Purpose & functions</TableHead>
                <TableHead>Connection</TableHead>
                <TableHead className="text-right">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {setup.devices.map((device) => {
                const Icon = modeIcons[device.mode];
                return (
                  <TableRow key={device.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setSelected(device)}
                        className="flex min-h-12 items-center gap-3 text-left hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <Icon className="size-5 shrink-0 text-primary" />
                        <span>
                          <span className="block font-semibold underline-offset-4 hover:underline">
                            {device.name}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {device.branch}
                          </span>
                        </span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <p>{modeLabels[device.mode]}</p>
                      <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                        {device.functions.map((f) => functionLabels[f]).join(" · ")}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">
                        {device.state === "pending" ? "Awaiting approval" : device.state}
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {device.last_seen_at
                          ? `Last contact ${new Date(device.last_seen_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : "No contact yet"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        onClick={() => setSelected(device)}
                        aria-label={`Manage ${device.name}`}
                      >
                        <Settings2 /> Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {selected !== undefined && setup && (
        <DeviceDialog
          key={selected?.id ?? "new"}
          device={selected}
          branches={setup.branches}
          organizationId={organizationId}
          onClose={() => setSelected(undefined)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
