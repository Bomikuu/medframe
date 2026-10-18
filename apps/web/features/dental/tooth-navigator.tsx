"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/features/patients/form-controls";
import type { Tooth } from "@/features/consultations/schema";
import type { DentalViewport } from "./use-dental-viewport";

// Display notation only. All selections and clinical writes retain FDI identity.
export function universalTooth(id: string) {
  const quadrant = Number(id[0]),
    tooth = Number(id[1]);
  if (quadrant <= 4)
    return String(
      quadrant === 1
        ? 9 - tooth
        : quadrant === 2
          ? tooth + 8
          : quadrant === 3
            ? 25 - tooth
            : tooth + 24,
    );
  const position =
    quadrant === 5
      ? 5 - tooth
      : quadrant === 6
        ? tooth + 4
        : quadrant === 7
          ? 15 - tooth
          : tooth + 14;
  return String.fromCharCode(65 + position);
}

export function ToothNavigator({
  teeth,
  dentition,
  onDentition,
  selected,
  onSelect,
  viewport,
}: {
  teeth: Tooth[];
  dentition: "permanent" | "primary";
  onDentition: (value: "permanent" | "primary") => void;
  selected: string;
  onSelect: (id: string) => void;
  viewport: DentalViewport;
}) {
  const [notation, setNotation] = useState<"fdi" | "universal">("fdi");
  const count = dentition === "permanent" ? 8 : 5;
  const rows = dentition === "permanent" ? [1, 2, 4, 3] : [5, 6, 8, 7];
  return (
    <nav aria-label="Individual teeth" className="h-full overflow-y-auto p-4 xl:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Teeth</h2>
        <div className="w-32">
          <FormSelect
            id="dentition"
            label="Dentition"
            value={dentition}
            onChange={(value) => onDentition(value as typeof dentition)}
            options={[
              { value: "permanent", label: "Permanent" },
              { value: "primary", label: "Primary" },
            ]}
          />
        </div>
      </div>
      <div
        role="group"
        aria-label="Display tooth notation"
        className="mb-5 grid grid-cols-2 rounded-lg bg-muted p-1"
      >
        {(["fdi", "universal"] as const).map((value) => (
          <Button
            type="button"
            key={value}
            variant={notation === value ? "outline" : "ghost"}
            aria-pressed={notation === value}
            onClick={() => setNotation(value)}
            className="h-9 capitalize"
          >
            {value === "fdi" ? "FDI" : "Universal"}
          </Button>
        ))}
      </div>
      {(["upper", "lower"] as const).map((jaw, index) => (
        <section key={jaw} className="mb-6">
          <h3 className="mb-3 text-xs font-semibold">
            {jaw === "upper" ? "Upper Jaw (Maxillary)" : "Lower Jaw (Mandibular)"}
          </h3>
          <div className="grid gap-1.5">
            {rows.slice(index * 2, index * 2 + 2).map((quadrant, row) => (
              <div
                key={quadrant}
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
              >
                {Array.from(
                  { length: count },
                  (_, position) => `${quadrant}${row === 0 ? count - position : position + 1}`,
                ).map((id) => (
                  <button
                    type="button"
                    key={id}
                    title={`FDI ${id}: ${teeth.find((tooth) => tooth.id === id)?.label}`}
                    aria-label={`Tooth ${id}, ${teeth.find((tooth) => tooth.id === id)?.label}`}
                    aria-pressed={selected === id}
                    onClick={() => onSelect(id)}
                    className={`min-h-9 rounded-md border text-xs font-medium tabular-nums outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary ${selected === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}
                  >
                    {notation === "fdi" ? id : universalTooth(id)}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}
      <section className="grid gap-2 border-t border-border pt-5">
        <h3 className="mb-2 text-sm font-semibold">View options</h3>
        {(
          [
            ["both", "Both jaws"],
            ["upper", "Upper jaw only"],
            ["lower", "Lower jaw only"],
          ] as const
        ).map(([value, label]) => (
          <Button
            type="button"
            key={value}
            variant={viewport.jaw === value && !viewport.isolate ? "secondary" : "ghost"}
            className="justify-start"
            aria-pressed={viewport.jaw === value && !viewport.isolate}
            onClick={() => {
              viewport.setJaw(value);
              viewport.setIsolate(false);
              viewport.setReference(false);
            }}
          >
            {label}
          </Button>
        ))}
        <Button
          type="button"
          variant={viewport.isolate ? "secondary" : "ghost"}
          aria-pressed={viewport.isolate}
          className="justify-start border-t border-border"
          onClick={() => {
            viewport.setReference(false);
            viewport.setIsolate(!viewport.isolate);
          }}
        >
          Isolate selected tooth
        </Button>
      </section>
    </nav>
  );
}
