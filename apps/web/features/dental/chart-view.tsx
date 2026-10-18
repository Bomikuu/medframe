"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import reference from "./reference.json";
import { DentalChartGrid } from "./dental-chart-grid";
import { FormSelect } from "@/features/patients/form-controls";
import { dentalReferenceSchema, type Finding } from "@/features/consultations/schema";

const Dental3D = dynamic(() => import("./dental-3d"), {
  ssr: false,
  loading: () => <p role="status">Loading schematic model…</p>,
});
export const schematicTeeth = dentalReferenceSchema.parse(reference).teeth;
export function ChartView({
  findings,
  label = "Recorded dental chart",
}: {
  findings: Finding[];
  label?: string;
}) {
  const [selected, setSelected] = useState("16");
  const [surface, setSurface] = useState<string | null>(null);
  const [dentition, setDentition] = useState<"permanent" | "primary">("permanent");
  const [show3D, setShow3D] = useState(false);
  const current = findings.filter((item) => item.tooth === selected);
  return (
    <section aria-label={label} className="grid gap-4">
      <h3 className="font-semibold">{label}</h3>
      <div className="flex flex-wrap items-end gap-4">
        <FormSelect
          id={`dentition-${label.replaceAll(" ", "-")}`}
          label="Dentition"
          value={dentition}
          onChange={(value) => {
            setDentition(value as typeof dentition);
            setSelected(value === "primary" ? "54" : "16");
            setSurface(null);
          }}
          options={[
            { value: "permanent", label: "Permanent" },
            { value: "primary", label: "Primary" },
          ]}
        />
        <Button
          type="button"
          variant="outline"
          aria-expanded={show3D}
          onClick={() => setShow3D(!show3D)}
        >
          {show3D ? "Hide 3D view" : "Show 3D view"}
        </Button>
      </div>
      <DentalChartGrid
        teeth={schematicTeeth.filter((item) => item.dentition === dentition)}
        dentition={dentition}
        selected={selected}
        findings={findings}
        onSelect={(id) => {
          setSelected(id);
          setSurface(null);
        }}
      />
      {show3D && (
        <Dental3D
          selected={selected}
          onSelect={(id, value) => {
            setSelected(id);
            setSurface(value ?? null);
          }}
          selectedSurface={surface}
          findings={findings}
          dentition={dentition}
        />
      )}
      <p className="text-sm font-medium">
        Tooth {selected}
        {surface && ` · ${surface}`}
      </p>
      <p className="text-xs text-muted-foreground">
        Schematic, unvalidated geometry. FDI notation; recorded findings are the source of truth.
      </p>
      {!current.length && (
        <p className="text-sm text-muted-foreground">
          No finding recorded in this snapshot. Absence does not establish healing.
        </p>
      )}
      {current.slice(0, 5).map((item) => (
        <p key={item.key} className="text-sm leading-6">
          {item.condition} · {item.surfaces.join(", ") || "Whole tooth"} · {item.status} ·{" "}
          {item.severity}
          {item.notes && ` — ${item.notes}`}
        </p>
      ))}
      {current.length > 5 && (
        <details>
          <summary className="min-h-11 text-sm">{current.length - 5} more findings</summary>
          {current.slice(5).map((item) => (
            <p key={item.key} className="py-2 text-sm">
              {item.condition} · {item.status} · {item.surfaces.join(", ")}
            </p>
          ))}
        </details>
      )}
    </section>
  );
}
