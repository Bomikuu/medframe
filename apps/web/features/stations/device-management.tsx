"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, Plus, RefreshCw, Search, Tablet, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { PageHeading } from "@/features/patients/feedback";
import { errorMessage } from "@/lib/auth/client";
import { functionLabels, modeLabels, stationRequest, type Device, type Mode } from "./client";
import { DeviceCard } from "./device-card";
import { DeviceDialog } from "./device-dialog";
import { DevicePairingDialog } from "./device-pairing-dialog";
import { DeviceSetupGuide } from "./device-setup-guide";

type Setup = { devices: Device[]; branches: { id: string; name: string }[] };
type Category = "all" | Mode;
type Sort = "newest" | "name" | "contact";
const categories: { value: Category; label: string }[] = [
  { value: "all", label: "All devices" },
  { value: "clinician", label: "Clinician tablets" },
  { value: "kiosk", label: "Patient kiosks" },
  { value: "display", label: "Queue displays" },
];

export function DeviceManagement() {
  const { organizationId, workspace, can, href } = useWorkspace();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [selected, setSelected] = useState<Device | null | undefined>(undefined);
  const [pairingDevice, setPairingDevice] = useState<Device | null>(null);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setSetup(await stationRequest<Setup>("manage", { organization_id: organizationId }));
      setError("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setRefreshing(false);
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

  const devices = setup?.devices ?? [];
  const search = query.trim().toLocaleLowerCase();
  const filtered = devices.filter(
    (device) =>
      (category === "all" || device.mode === category) &&
      [
        device.name,
        device.branch,
        modeLabels[device.mode],
        ...device.functions.map((value) => functionLabels[value] ?? value),
      ].some((value) => value.toLocaleLowerCase().includes(search)),
  );
  // The native manage endpoint returns newest-created devices first.
  if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "contact")
    filtered.sort(
      (a, b) =>
        (b.last_seen_at ? Date.parse(b.last_seen_at) : 0) -
        (a.last_seen_at ? Date.parse(a.last_seen_at) : 0),
    );

  if (!can("organization.manage"))
    return <p role="alert">Clinic administration permission is required to manage devices.</p>;

  return (
    <div className="min-w-0">
      <PageHeading
        title="Devices & Stations"
        description="Manage clinic devices for patient check-in, queue displays and clinical workspaces."
      >
        <ButtonLink href={href("/clinic/stations")} variant="outline">
          <LayoutGrid /> Patient Stations & departments
        </ButtonLink>
        <ButtonLink href={href("/station/clinician")} variant="outline">
          <UsersRound /> Doctor workspace & code
        </ButtonLink>
        <Button onClick={() => setSelected(null)} disabled={!setup}>
          <Plus /> Add device
        </Button>
      </PageHeading>
      <DeviceSetupGuide />
      {error && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p role="alert" className="text-sm leading-6 text-destructive">
            {error}
          </p>
          <Button variant="outline" disabled={refreshing} onClick={() => void refresh()}>
            Retry loading devices
          </Button>
        </div>
      )}
      {!setup ? (
        <div
          className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          role="status"
          aria-label="Loading clinic devices"
        >
          <span className="sr-only">Loading clinic devices…</span>
          {[0, 1, 2].map((value) => (
            <Skeleton key={value} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : (
        <Tabs
          value={category}
          onValueChange={(value) => setCategory(value as Category)}
          className="mt-7 gap-4"
        >
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
            <TabsList
              aria-label="Device categories"
              className="h-auto max-w-full flex-wrap justify-start gap-1.5 bg-transparent p-0 group-data-[orientation=horizontal]/tabs:h-auto"
            >
              {categories.map(({ value, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-11 flex-none gap-2 rounded-lg bg-card px-3 text-xs text-foreground sm:text-sm"
                >
                  {label}
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] leading-4 font-semibold tabular-nums">
                    {value === "all"
                      ? devices.length
                      : devices.filter((device) => device.mode === value).length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto">
              <div className="relative min-w-0 flex-1 basis-full sm:min-w-52 sm:basis-auto lg:w-56">
                <label htmlFor="device-search" className="sr-only">
                  Search devices
                </label>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="device-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search devices…"
                  maxLength={160}
                  className="h-11 bg-card pl-9"
                />
              </div>
              <Select value={sort} onValueChange={(value) => setSort(value as Sort)}>
                <SelectTrigger
                  aria-label="Sort devices"
                  className="h-11 w-40 bg-card data-[size=default]:h-11"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="name">Name A–Z</SelectItem>
                  <SelectItem value="contact">Last contact</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Refresh devices"
                disabled={refreshing}
                className="size-11 shrink-0 bg-card"
                onClick={() => void refresh()}
              >
                <RefreshCw className={refreshing ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>
          <TabsContent value={category} className="mt-0">
            <p className="sr-only" role="status">
              {filtered.length} {filtered.length === 1 ? "device" : "devices"} shown
            </p>
            {!devices.length ? (
              <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
                <Tablet className="mx-auto mb-4 size-7 text-teal-ink" aria-hidden="true" />
                <h2 className="text-xl font-semibold">Connect your first clinic device</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                  Create a clinician tablet, patient kiosk or queue display, then connect it using a
                  private pairing code.
                </p>
                <Button className="mt-6" onClick={() => setSelected(null)}>
                  <Plus /> Add device
                </Button>
              </div>
            ) : !filtered.length ? (
              <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
                <Search className="mx-auto mb-4 size-6 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-lg font-semibold">No devices match these filters</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try a different name, branch or device type.
                </p>
                <Button
                  variant="outline"
                  className="mt-5"
                  onClick={() => {
                    setQuery("");
                    setCategory("all");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((device) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    timezone={workspace.organization.timezone}
                    onManage={() => setSelected(device)}
                    onPair={() => setPairingDevice(device)}
                  />
                ))}
              </div>
            )}
            {devices.length === 200 && (
              <p className="mt-4 text-xs text-muted-foreground">
                Showing the newest 200 devices available to your account. Search and counts apply to
                this loaded list.
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}
      {pairingDevice && (
        <DevicePairingDialog
          key={pairingDevice.id}
          device={pairingDevice}
          organizationId={organizationId}
          onClose={() => setPairingDevice(null)}
          onSaved={refresh}
        />
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
