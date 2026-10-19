"use client";
import {
  Bone,
  UserRound,
  Search,
  ChevronRight,
  Layers3,
  HeartPulse,
  Scan,
  Accessibility,
  CircleHelp,
  Skull,
  ScanLine,
  Hand,
  Footprints,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { structures } from "./asset-registry";
import { navigationGroup, regionGroups, type RegionGroup } from "./navigation";
import type { AnatomyLayer } from "./schema";
const groupIcons = {
  head: Skull,
  thorax: HeartPulse,
  abdomen: ScanLine,
  pelvis: Scan,
  upper: Hand,
  lower: Footprints,
};
export function StructureNavigator({
  layer,
  onLayer,
  selected,
  onSelect,
  query,
  onQuery,
  group,
  onGroup,
  map,
  onMap,
}: {
  layer: AnatomyLayer;
  onLayer: (layer: AnatomyLayer) => void;
  selected: string;
  onSelect: (id: string) => void;
  query: string;
  onQuery: (query: string) => void;
  group: RegionGroup | null;
  onGroup: (group: RegionGroup | null) => void;
  map: boolean;
  onMap: (map: boolean) => void;
}) {
  const matching = structures.filter(
    (item) =>
      item.layer === layer &&
      `${item.label} ${item.side}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pt-6">
        <h2 className="mb-3 text-lg font-semibold">Anatomy</h2>
        <Tabs value={layer} onValueChange={(value) => onLayer(value as AnatomyLayer)}>
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="body">Human body</TabsTrigger>
            <TabsTrigger value="skeleton">Skeleton</TabsTrigger>
          </TabsList>
        </Tabs>
        <label className="relative mt-4 block">
          <span className="sr-only">Search structures</span>
          <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search structures…"
            className="pl-9 text-xs"
          />
        </label>
      </div>
      <nav aria-label="Anatomical structures" className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
        <button
          type="button"
          className="mb-2 flex min-h-11 w-full items-center gap-3 rounded-lg bg-muted/60 px-3 text-sm font-semibold"
          onClick={() => onGroup(group ? null : "head")}
        >
          {layer === "body" ? <UserRound className="size-4" /> : <Bone className="size-4" />}
          {layer === "body" ? "Body regions" : "Skeletal regions"}
          <span className="ml-auto text-[10px] font-normal text-muted-foreground">
            {matching.length}
          </span>
        </button>
        {regionGroups.map((item) => {
          const matches = matching.filter((structure) => navigationGroup(structure) === item.id);
          if (!matches.length) return null;
          const Icon = groupIcons[item.id];
          const open = Boolean(query) || group === item.id;
          return (
            <div key={item.id}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => onGroup(group === item.id ? null : item.id)}
                className="aria-expanded:bg-teal-wash flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted aria-expanded:text-teal-ink"
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight
                  className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`}
                />
              </button>
              {open && (
                <ul className="my-1 ml-5 grid gap-0.5 border-l border-border pl-2">
                  {matches.map((structure) => (
                    <li key={structure.id}>
                      <button
                        type="button"
                        aria-pressed={structure.id === selected}
                        className="aria-pressed:bg-teal-wash/60 w-full rounded-md px-2 py-2 text-left text-xs leading-5 text-muted-foreground hover:bg-muted aria-pressed:font-medium aria-pressed:text-teal-ink"
                        onClick={() => onSelect(structure.id)}
                      >
                        {structure.label}
                        <span className="block text-[10px] opacity-80">
                          Patient {structure.side}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        {!matching.length && (
          <p role="status" className="px-3 py-5 text-xs leading-5 text-muted-foreground">
            No matching structures. Try a region or patient side.
          </p>
        )}
      </nav>
      <div className="shrink-0 border-t border-border p-3">
        <div className="mb-2 flex items-center justify-between px-2 text-xs font-semibold">
          <span>View mode</span>
          <CircleHelp className="size-3.5 text-muted-foreground" />
        </div>
        <Button
          type="button"
          variant={map ? "ghost" : "secondary"}
          className="h-10 w-full justify-start text-xs"
          onClick={() => onMap(false)}
        >
          <Accessibility />
          {layer === "body" ? "Surface regions" : "Skeletal structures"}
        </Button>
        <Button
          type="button"
          variant={map ? "secondary" : "ghost"}
          className="h-10 w-full justify-start text-xs"
          onClick={() => onMap(true)}
        >
          <Layers3 />
          2D reference map
        </Button>
        <div className="mt-2 flex gap-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
          <span title="Organ models are not available">Organs · unavailable</span>
          <span>Other systems · unavailable</span>
        </div>
      </div>
    </div>
  );
}
