"use client";
import { useEffect, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Expand, Minimize, MousePointer2, MapPin, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { EncounterForm } from "@/features/consultations/schema";
import { structures, structureLabel } from "./asset-registry";
import type { AnatomyAnchor, AnatomyCamera, AnatomyLayer } from "./schema";
import { AnatomyViewport } from "./anatomy-viewport";
import { AnatomyMap } from "./anatomy-map";
import { FindingForm } from "./finding-form";
import { PatientAnatomy } from "./patient-anatomy";

export function AnatomyEditor({
  active,
  readOnly,
  patientId,
  save,
}: {
  active: boolean;
  readOnly: boolean;
  patientId: string;
  save: () => Promise<unknown>;
}) {
  const { control } = useFormContext<EncounterForm>();
  const entries = useFieldArray({ control, name: "content.anatomy_findings" });
  const findings = useWatch({ control, name: "content.anatomy_findings" }) ?? [];
  const [layer, setLayer] = useState<AnatomyLayer>("body");
  const [view, setView] = useState<AnatomyCamera>("front");
  const [selection, setSelection] = useState(structures[0].id);
  const [query, setQuery] = useState("");
  const [focusKey, setFocusKey] = useState<string>();
  const [annotate, setAnnotate] = useState(false);
  const [map, setMap] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isolate, setIsolate] = useState(false);
  const [reset, setReset] = useState(0);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const current = structures.find((value) => value.id === selection);
  const focused = findings.findIndex((value) => value.key === focusKey);
  function add(id = selection, anchor?: AnatomyAnchor) {
    const item = structures.find((value) => value.id === id);
    if (readOnly || !item || findings.length >= 60) return;
    const key = crypto.randomUUID();
    entries.append({
      key,
      registry_version: 1,
      layer: item.layer as AnatomyLayer,
      structure_id: item.id,
      side: item.side as "left" | "right" | "midline",
      description: "",
      category: "observed",
      severity: "unknown",
      status: "active",
      notes: "",
      terminology_system: "",
      code: "",
      anchor,
    });
    setFocusKey(key);
    setAnnotate(false);
  }
  function select(id: string) {
    setSelection(id);
    setFocusKey(undefined);
  }
  const fallback = (
    <div className="grid h-full grid-rows-[auto_1fr]">
      <p role="status" className="p-3 text-sm">
        3D unavailable. Your draft is retained; use the 2D map and structure list.
      </p>
      <AnatomyMap
        view={view}
        enabled={annotate && !readOnly}
        onAnchor={(anchor) => add(selection, anchor)}
      />
    </div>
  );
  return (
    <section
      aria-label="Anatomy editor"
      className={
        expanded && active
          ? "fixed inset-0 z-50 flex flex-col overflow-auto bg-background"
          : "min-w-0 overflow-hidden rounded-xl border border-border bg-card"
      }
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">Anatomy workspace</h2>
          <p className="text-xs text-muted-foreground">Body & skeleton · generic adult reference</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {expanded && !readOnly && (
            <Button type="button" onClick={() => void save()}>
              Save consultation draft
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => setExpanded(!expanded)}>
            {expanded ? <Minimize /> : <Expand />}
            {expanded ? "Exit expanded view" : "Expand editor"}
          </Button>
        </div>
      </header>
      <div
        className={
          expanded
            ? "grid min-h-0 flex-1 lg:grid-cols-[240px_minmax(0,1fr)_320px]"
            : "grid min-w-0 xl:grid-cols-[210px_minmax(300px,1fr)_280px]"
        }
      >
        <aside className="grid content-start gap-4 border-b border-border p-4 lg:border-r lg:border-b-0">
          <label className="grid gap-2 text-sm font-medium">
            Anatomical layer
            <select
              aria-label="Anatomical layer"
              className="h-11 rounded-md border border-input bg-background px-3"
              value={layer}
              onChange={(event) => {
                const value = event.target.value as AnatomyLayer;
                setLayer(value);
                select(structures.find((item) => item.layer === value)!.id);
                setIsolate(false);
              }}
            >
              <option value="body">Body regions</option>
              <option value="skeleton">Skeleton</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Find a structure
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. femur"
            />
          </label>
          <div
            role="list"
            aria-label="Anatomical structures"
            className="max-h-52 overflow-y-auto lg:max-h-[460px]"
          >
            {structures
              .filter(
                (item) =>
                  item.layer === layer &&
                  `${item.label} ${item.side}`.toLowerCase().includes(query.toLowerCase()),
              )
              .map((item) => (
                <button
                  type="button"
                  role="listitem"
                  key={item.id}
                  aria-pressed={selection === item.id}
                  className="aria-pressed:bg-teal-wash mb-1 flex min-h-11 w-full flex-col rounded-md px-3 py-2 text-left text-sm hover:bg-muted aria-pressed:text-teal-ink"
                  onClick={() => select(item.id)}
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-muted-foreground">Patient {item.side}</span>
                </button>
              ))}
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <Checkbox checked={isolate} onCheckedChange={(value) => setIsolate(value === true)} />
            Isolate selected structure
          </label>
          <p className="text-xs text-muted-foreground">
            Left and right always refer to the patient. Rotate by dragging; scroll to zoom,
            right-drag to pan.
          </p>
        </aside>
        <div className="flex min-w-0 flex-col bg-muted/30">
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card p-3">
            <Button
              type="button"
              size="sm"
              variant={annotate ? "ghost" : "secondary"}
              onClick={() => setAnnotate(false)}
            >
              <MousePointer2 />
              Select
            </Button>
            {!readOnly && (
              <Button
                type="button"
                size="sm"
                variant={annotate ? "secondary" : "ghost"}
                onClick={() => setAnnotate(true)}
              >
                <MapPin />
                Annotate
              </Button>
            )}
            <label className="sr-only" htmlFor="anatomy-view">
              Camera view
            </label>
            <select
              id="anatomy-view"
              className="h-10 rounded-md border border-input bg-background px-2 text-sm"
              value={view}
              onChange={(event) => setView(event.target.value as AnatomyCamera)}
            >
              {["front", "back", "left", "right"].map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)} view
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setReset(reset + 1);
                setIsolate(false);
              }}
            >
              <RotateCcw />
              Fit / reset
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setMap(!map)}>
              {map ? "Use 3D model" : "Use 2D map"}
            </Button>
          </div>
          <div
            className={expanded ? "relative min-h-[420px] flex-1" : "relative h-[480px] min-w-0"}
            aria-label="Anatomical viewport"
          >
            {map ? (
              <AnatomyMap
                view={view}
                enabled={annotate && !readOnly}
                onAnchor={(anchor) => add(selection, anchor)}
              />
            ) : active ? (
              <AnatomyViewport
                layer={layer}
                selected={selection}
                isolate={isolate}
                findings={findings}
                annotate={annotate && !readOnly}
                onSelect={select}
                onAnchor={add}
                view={view}
                reset={reset}
                onFailure={() => setMap(true)}
                fallback={fallback}
              />
            ) : (
              <p className="p-5 text-sm">Model paused while this tab is hidden.</p>
            )}
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-border bg-card px-4 py-3 text-xs">
            <span>Selected: {current ? structureLabel(current.id) : "Unavailable"}</span>
            <span>{annotate ? "Click a point to start a finding" : "Selection mode"}</span>
          </div>
          <p className="px-4 py-3 text-xs text-muted-foreground">
            Z-Anatomy / BodyParts3D · adapted under CC BY-SA 4.0.{" "}
            <a
              className="underline"
              href="/models/anatomy-attribution.txt"
              target="_blank"
              rel="noreferrer"
            >
              Source & attribution
            </a>
            . Not calibrated or patient-specific.
          </p>
        </div>
        <aside className="grid content-start gap-5 border-t border-border p-4 lg:border-t-0 lg:border-l">
          {!readOnly && (
            <Button type="button" disabled={findings.length >= 60} onClick={() => add()}>
              Add finding for selected structure
            </Button>
          )}
          <div>
            <h3 className="mb-3 font-semibold">Consultation findings ({findings.length}/60)</h3>
            {findings.length ? (
              <ul className="grid gap-2">
                {findings.map((value, index) => (
                  <li key={value.key}>
                    <button
                      type="button"
                      className="w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setFocusKey(value.key);
                        setSelection(value.structure_id);
                        setLayer(value.layer);
                      }}
                    >
                      <span className="font-medium">
                        {index + 1}. {value.description || "Complete finding description"}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {structureLabel(value.structure_id)} · {value.status.replaceAll("_", " ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a structure or annotate a model point to record the first finding.
              </p>
            )}
          </div>
          {focused >= 0 && (
            <>
              <FindingForm key={findings[focused].key} index={focused} readOnly={readOnly} />
              {!readOnly && !findings[focused].source_revision_id && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    entries.remove(focused);
                    setFocusKey(undefined);
                  }}
                >
                  Remove draft finding
                </Button>
              )}
            </>
          )}
        </aside>
      </div>
      <details className="border-t border-border p-4">
        <summary className="min-h-11 cursor-pointer font-medium">
          Patient anatomy history & carry forward
        </summary>
        <PatientAnatomy
          patientId={patientId}
          onCarry={
            readOnly
              ? undefined
              : (value) => {
                  if (!findings.some((item) => item.key === value.key) && findings.length < 60) {
                    entries.append(value);
                    setFocusKey(value.key);
                    setLayer(value.layer);
                    setSelection(value.structure_id);
                  }
                }
          }
        />
      </details>
    </section>
  );
}
