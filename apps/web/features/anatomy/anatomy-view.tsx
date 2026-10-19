"use client";
import { useState } from "react";
import type { AnatomyFinding } from "./schema";
import { structureLabel } from "./asset-registry";
import { AnatomyMap } from "./anatomy-map";
import { AnatomyViewport } from "./anatomy-viewport";
import { Button } from "@/components/ui/button";
export function AnatomyView({ findings }: { findings: AnatomyFinding[] }) {
  const [model, setModel] = useState(false);
  const [selected, setSelected] = useState(findings[0]?.structure_id ?? "");
  const layer = findings.find((value) => value.structure_id === selected)?.layer ?? "body";
  const fallback = <AnatomyMap view="front" enabled={false} />;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Generic anatomical reference. Findings are clinician-entered; absence does not mean
          resolved.
        </p>
        <Button type="button" variant="outline" onClick={() => setModel(!model)}>
          {model ? "Use static reference" : "View recorded 3D pins"}
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(240px,1fr)_minmax(280px,1fr)]">
        <div className="h-[420px] overflow-hidden rounded-xl border border-border bg-muted/30">
          {model ? (
            <AnatomyViewport
              layer={layer}
              selected={selected}
              isolate={false}
              findings={findings}
              onSelect={setSelected}
              view="front"
              reset={0}
              onFailure={() => setModel(false)}
              fallback={fallback}
            />
          ) : (
            fallback
          )}
        </div>
        <ul className="grid content-start gap-4">
          {findings.map((value) => (
            <li key={value.key} className="border-b border-border pb-4">
              <button
                type="button"
                className="min-h-11 text-left font-medium hover:underline"
                onClick={() => setSelected(value.structure_id)}
              >
                {value.description}
              </button>
              <p className="text-sm">{structureLabel(value.structure_id)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {value.category} · {value.severity} · {value.status.replaceAll("_", " ")}
              </p>
              {value.notes && <p className="mt-3 text-sm whitespace-pre-wrap">{value.notes}</p>}
              {value.anchor?.kind === "model" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  3D point on {value.anchor.asset_version}. An unavailable historical model is never
                  substituted.
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
