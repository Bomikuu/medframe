"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { structures, structureLabel } from "@/features/anatomy/asset-registry";
import { PERMANENT_IDS } from "@/features/dental/anatomy";
import { cn } from "@/lib/utils";
import type { ModelPresentation } from "./use-model-presentation";
import type { ModelPart } from "./presentation-types";

export function modelPartLabel(part: ModelPart | null, dental: boolean) {
  if (!part) return "None";
  return dental
    ? `Tooth ${part.id}${part.surface ? `, ${part.surface}` : ", whole tooth"}`
    : structureLabel(part.id);
}
export function ModelPartsSheet({
  open,
  close,
  share,
  doctor,
}: {
  open: boolean;
  close: () => void;
  share: ModelPresentation;
  doctor: boolean;
}) {
  const [search, setSearch] = useState("");
  const state = share.presentation!;
  const dental = state.model === "dental";
  const selected = doctor ? state.doctor_focus : state.patient_pointer;
  const entries = dental
    ? PERMANENT_IDS.map((id) => ({ id, label: `Tooth ${id}` }))
    : structures
        .filter((item) => item.layer === state.model)
        .map((item) => ({ id: item.id, label: structureLabel(item.id) }));
  const filtered = entries.filter((item) =>
    `${item.id} ${item.label}`.toLowerCase().includes(search.toLowerCase()),
  );
  function select(id: string, surface: string | null = null) {
    if (doctor) share.setFocus({ id, surface });
    else share.point({ id, surface });
  }
  const surfaces =
    selected && dental
      ? [
          "mesial",
          "distal",
          "facial",
          "lingual",
          Number(selected.id[1]) <= 3 ? "incisal" : "occlusal",
        ]
      : [];
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
    >
      <SheetContent className="flex min-h-0 w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Model parts</SheetTitle>
          <SheetDescription>
            {share.canSelect
              ? doctor
                ? "Select a part to bring it into the shared view."
                : "Choose a part to point it out to your doctor."
              : "View only. Your doctor controls this presentation."}
          </SheetDescription>
        </SheetHeader>
        <div className="grid shrink-0 gap-3 px-4">
          <div className="relative">
            <label htmlFor="model-part-search" className="sr-only">
              Search model parts
            </label>
            <Input
              id="model-part-search"
              type="search"
              placeholder="Search model parts…"
              value={search}
              className="pr-11"
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 size-11"
                aria-label="Clear part search"
                onClick={() => {
                  setSearch("");
                  document.getElementById("model-part-search")?.focus();
                }}
              >
                <X aria-hidden className="size-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {filtered.length} parts.{" "}
            {dental ? "FDI permanent tooth numbers." : "Patient left and right."}
          </p>
          {surfaces.length > 0 && (
            <div className="grid gap-2 border-y border-border py-3">
              <p className="text-sm font-medium">Tooth {selected!.id} surfaces</p>
              <p className="text-xs leading-5 text-muted-foreground">
                Mesh clicks select the whole tooth. Choose its surface here.
              </p>
              <div className="flex flex-wrap gap-2">
                {surfaces.map((surface) => (
                  <Button
                    key={surface}
                    variant={selected?.surface === surface ? "secondary" : "outline"}
                    size="sm"
                    disabled={!share.canSelect}
                    aria-pressed={selected?.surface === surface}
                    onClick={() => select(selected!.id, surface)}
                    className="capitalize"
                  >
                    {surface}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!share.canSelect}
                  onClick={() => select(selected!.id)}
                >
                  Whole tooth
                </Button>
              </div>
            </div>
          )}
        </div>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto p-4",
            dental ? "grid grid-cols-4 content-start gap-2 sm:grid-cols-8" : "space-y-1",
          )}
        >
          {!filtered.length && (
            <p className="col-span-full py-6 text-sm text-muted-foreground">
              No matching parts. Try another name or tooth number.
            </p>
          )}
          {filtered.map((entry) => (
            <button
              key={entry.id}
              type="button"
              disabled={!share.canSelect}
              aria-label={entry.label}
              aria-pressed={selected?.id === entry.id}
              onClick={() => select(entry.id)}
              className={cn(
                "min-h-11 cursor-pointer rounded-lg border border-border p-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-60",
                dental ? "text-center" : "w-full",
                selected?.id === entry.id && "border-teal-600 bg-teal-50 text-teal-950",
              )}
            >
              {dental ? entry.id : entry.label}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
