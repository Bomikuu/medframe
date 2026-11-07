"use client";

import { useRef, useState } from "react";
import { Box, Clock3, MoreHorizontal, Pencil, Plus, Search, X } from "lucide-react";
import { StaffAvatar } from "@/features/staff/staff-photo";
import { writtenDate } from "@/components/application/date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScheduleSection } from "./schedule-section";
import { weekdays } from "./availability-days";
import type { OperationsSetup } from "./schema";

type Schedule = OperationsSetup["schedules"][number];
type Resource = OperationsSetup["resources"][number];

function AvailabilityStatus({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${active ? "bg-teal-soft text-teal-ink" : "bg-muted text-muted-foreground"}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function SavedWindowsPanel({
  setup,
  providerFilter,
  clearFilter,
  add,
  edit,
  toggle,
  busy,
}: {
  setup: OperationsSetup;
  providerFilter: string;
  clearFilter: () => void;
  add: () => void;
  edit: (row: Schedule) => void;
  toggle: (row: Schedule) => void;
  busy: boolean;
}) {
  const rows = setup.schedules.filter(
    (row) => !providerFilter || row.provider_id === providerFilter,
  );
  return (
    <ScheduleSection
      id="saved-windows"
      title="Saved weekly windows"
      description="Edit recurring hours for your providers. Each saved window keeps its own effective dates and status."
      icon={Clock3}
      actions={
        <Button variant="outline" onClick={add}>
          <Plus className="size-4" />
          Add weekly window
        </Button>
      }
    >
      {providerFilter && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 text-sm">
          <p>
            Windows for{" "}
            {setup.providers.find((row) => row.id === providerFilter)?.name ?? "selected provider"}
          </p>
          <Button variant="ghost" size="sm" onClick={clearFilter}>
            <X className="size-3.5" />
            Show all providers
          </Button>
        </div>
      )}
      {!rows.length ? (
        <p className="px-6 py-8 text-sm leading-6 text-muted-foreground">
          No weekly windows{providerFilter ? " for this provider" : " yet"}. Add availability to
          define recurring appointment hours.
        </p>
      ) : (
        <ul className="divide-y divide-border px-5 sm:px-6">
          {rows.map((row) => {
            const name =
              setup.providers.find((provider) => provider.id === row.provider_id)?.name ??
              "Unavailable provider";
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <StaffAvatar
                    name={name}
                    photoId={
                      setup.providers.find((provider) => provider.id === row.provider_id)?.photo_id
                    }
                    className="size-9 text-xs"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {name} · {weekdays[row.weekday]}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
                      <span className="tabular-nums">
                        {row.opens.slice(0, 5)}–{row.closes.slice(0, 5)} · {row.duration} minutes
                      </span>
                      <AvailabilityStatus active={row.active} />
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {writtenDate(row.effective_from)} – {writtenDate(row.effective_to)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => edit(row)}>
                    Edit
                    <span className="sr-only">
                      {" "}
                      {weekdays[row.weekday]} window for {name}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={
                      row.active
                        ? "border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10"
                        : "border-primary/20 bg-teal-soft text-teal-ink"
                    }
                    disabled={busy}
                    onClick={() => toggle(row)}
                  >
                    {row.active ? "Disable" : "Enable"}
                    <span className="sr-only">
                      {" "}
                      {weekdays[row.weekday]} window for {name}
                    </span>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ScheduleSection>
  );
}

export function ScheduleResources({
  rows,
  add,
  edit,
  toggle,
  busy,
}: {
  rows: Resource[];
  add: () => void;
  edit: (row: Resource) => void;
  toggle: (row: Resource) => void;
  busy: boolean;
}) {
  const [search, setSearch] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const filtered = rows.filter((row) =>
    row.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <ScheduleSection
      id="schedule-resources"
      title="Rooms and chairs"
      description="Manage shared spaces and resources used for appointments."
      icon={Box}
    >
      <div className="px-5 py-5 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-40 flex-1">
            <Search
              className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={input}
              aria-label="Search resources"
              placeholder="Search resources…"
              className="pr-10 pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-0.5 right-0.5 size-10"
                aria-label="Clear resource search"
                onClick={() => {
                  setSearch("");
                  input.current?.focus();
                }}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
          <Button onClick={add}>
            <Plus className="size-4" />
            Add resource
          </Button>
        </div>
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">Resources in the selected clinic branch</caption>
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="rounded-l-lg px-3 py-3 font-medium">
                Resource name
              </th>
              <th scope="col" className="w-24 px-2 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="w-12 rounded-r-lg">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-border/70 last:border-0">
                <th scope="row" className="px-3 py-3.5 font-normal break-words">
                  {row.name}
                </th>
                <td className="px-2 py-3.5">
                  <AvailabilityStatus active={row.active} />
                </td>
                <td className="py-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        aria-label={`Actions for ${row.name}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onSelect={() => edit(row)}>
                        <Pencil className="size-4" />
                        Rename resource
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => toggle(row)}>
                        {row.active ? "Disable resource" : "Enable resource"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <p className="py-8 text-center text-sm leading-6 text-muted-foreground" role="status">
            {search
              ? "No matching resources. Try another name or clear the search."
              : "No resources added. Add a room or chair when appointments need a reserved space."}
          </p>
        )}
      </div>
    </ScheduleSection>
  );
}
