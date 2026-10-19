"use client";
import { useEffect, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Plus, Minus, RotateCcw, LocateFixed, Bot, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EncounterForm } from "@/features/consultations/schema";
import { structures } from "./asset-registry";
import { navigationGroup, type RegionGroup } from "./navigation";
import { structureView } from "./camera-focus";
import type { AnatomyAnchor, AnatomyCamera, AnatomyFinding, AnatomyLayer } from "./schema";
import { AnatomyViewport } from "./anatomy-viewport";
import { AnatomyMap } from "./anatomy-map";
import { AnatomyHeader, type AnatomyConsultation } from "./anatomy-header";
import { AnatomyToolbar } from "./anatomy-toolbar";
import { StructureNavigator } from "./structure-navigator";
import { AnatomyInspector, type InspectorTab } from "./anatomy-inspector";
import { AnatomyAssistant } from "./anatomy-assistant";
import { ViewThumbnails } from "./view-thumbnails";
import { EditorPanel } from "./editor-panel";
import { useDesktopPanels } from "./use-editor-panels";
import { useEditorSelection } from "@/features/stations/editor-selection";

const initialStructure =
  structures.find((value) => value.id === "body.posterior_region_of_armr") ?? structures[0];
export function AnatomyEditor({
  active,
  readOnly,
  patientId,
  save,
  consultation,
}: {
  active: boolean;
  readOnly: boolean;
  patientId: string;
  save: () => Promise<unknown>;
  consultation: AnatomyConsultation;
}) {
  const { control } = useFormContext<EncounterForm>();
  const entries = useFieldArray({ control, name: "content.anatomy_findings" });
  const findings = useWatch({ control, name: "content.anatomy_findings" }) ?? [];
  const wide = useDesktopPanels();
  const editorSelection = useEditorSelection();
  const restored = editorSelection?.initial;
  const updateSelection = editorSelection?.update;
  const start = structures.find((value) => value.id === restored?.structure) || initialStructure;
  const [layer, setLayer] = useState<AnatomyLayer>(start.layer as AnatomyLayer);
  const [view, setView] = useState<AnatomyCamera>(
    restored?.structure ? structureView(start) : "front",
  );
  const [selection, setSelection] = useState(start.id);
  useEffect(() => {
    updateSelection?.({ structure: selection, layer });
  }, [selection, layer, updateSelection]);
  const [group, setGroup] = useState<RegionGroup | null>(null);
  const [query, setQuery] = useState("");
  const [focusKey, setFocusKey] = useState<string>();
  const [annotate, setAnnotate] = useState(false);
  const [map, setMap] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [isolate, setIsolate] = useState(false);
  const [reset, setReset] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [cameraFocus, setCameraFocus] = useState<string | undefined>(
    restored?.structure ? start.id : undefined,
  );
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [assistantDrawer, setAssistantDrawer] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("details");
  const desktop = wide && expanded;
  const current = structures.find((value) => value.id === selection) ?? initialStructure;
  const focused = findings.findIndex((value) => value.key === focusKey);
  useEffect(() => {
    if (!active || !expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (
        !event.defaultPrevented &&
        event.key === "Escape" &&
        !document.querySelector('[data-slot="sheet-content"]')
      )
        setExpanded(false);
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", close);
    };
  }, [active, expanded]);

  function select(id: string) {
    const structure = structures.find((value) => value.id === id);
    if (!structure) return;
    setSelection(id);
    setLayer(structure.layer as AnatomyLayer);
    setGroup(navigationGroup(structure));
    setFocusKey(undefined);
  }
  function focusFinding(key: string) {
    const finding = findings.find((value) => value.key === key);
    if (!finding) return;
    select(finding.structure_id);
    setFocusKey(key);
    setInspectorTab("findings");
    setInspectorOpen(true);
  }
  function navigateToStructure(id: string) {
    const structure = structures.find((value) => value.id === id);
    if (!structure) return;
    select(id);
    setView(structureView(structure));
    setCameraFocus(id);
    // Re-selecting the same entry restores its view after manual orbit/zoom.
    setReset((value) => value + 1);
    setNavigatorOpen(false);
  }
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
    select(id);
    setFocusKey(key);
    setAnnotate(false);
    setInspectorTab("findings");
    setInspectorOpen(true);
  }
  function carry(value: AnatomyFinding) {
    if (readOnly || findings.some((item) => item.key === value.key) || findings.length >= 60)
      return;
    entries.append(value);
    select(value.structure_id);
    setFocusKey(value.key);
    setInspectorTab("findings");
  }
  function changeLayer(value: AnatomyLayer) {
    setLayer(value);
    select(structures.find((item) => item.layer === value)!.id);
    setGroup(null);
    setQuery("");
    setIsolate(false);
    setCameraFocus(undefined);
  }
  function resetView() {
    setIsolate(false);
    setCameraFocus(undefined);
    setReset((value) => value + 1);
  }
  function failure() {
    setModelFailed(true);
    setMap(true);
  }
  const mapView = (
    <AnatomyMap
      view={view}
      enabled={annotate && !readOnly}
      onAnchor={(anchor) => add(selection, anchor)}
    />
  );

  return (
    <section
      aria-label="Anatomy editor"
      className={
        expanded && active
          ? "fixed inset-0 z-40 flex h-dvh min-h-0 flex-col overflow-hidden bg-background"
          : "relative flex h-[780px] min-h-[560px] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card"
      }
    >
      <AnatomyHeader
        consultation={consultation}
        readOnly={readOnly}
        active={active}
        save={save}
        onHistory={() => {
          setInspectorTab("history");
          setInspectorOpen(true);
        }}
      />
      <div
        className={`grid min-h-0 flex-1 ${desktop ? (assistantOpen ? "grid-cols-[200px_minmax(0,1fr)_300px] min-[1660px]:grid-cols-[228px_minmax(0,1fr)_350px]" : "grid-cols-[200px_minmax(0,1fr)] min-[1660px]:grid-cols-[228px_minmax(0,1fr)]") : "grid-cols-1"}`}
      >
        <EditorPanel
          desktop={desktop}
          open={navigatorOpen}
          onOpenChange={setNavigatorOpen}
          side="left"
          title="Anatomy navigator"
          description="Choose a layer, region and named structure."
          className="border-r border-border"
        >
          <StructureNavigator
            layer={layer}
            onLayer={changeLayer}
            selected={selection}
            onSelect={navigateToStructure}
            query={query}
            onQuery={setQuery}
            group={group}
            onGroup={setGroup}
            map={map}
            onMap={setMap}
          />
        </EditorPanel>
        <div
          className={`grid min-h-0 min-w-0 ${desktop ? "grid-cols-[minmax(0,1fr)_272px] min-[1660px]:grid-cols-[minmax(0,1fr)_310px]" : "grid-cols-1"}`}
        >
          <main className="flex min-h-0 min-w-0 flex-col bg-muted/20">
            <AnatomyToolbar
              annotate={annotate}
              onAnnotate={setAnnotate}
              readOnly={readOnly}
              view={view}
              onView={setView}
              onReset={resetView}
              expanded={expanded}
              onExpand={() => setExpanded(!expanded)}
              assistantOpen={desktop && assistantOpen}
              onAssistant={() => (desktop ? setAssistantOpen(true) : setAssistantDrawer(true))}
              onNavigator={() => setNavigatorOpen(true)}
              onInspector={() => setInspectorOpen(true)}
              desktop={desktop}
            />
            {modelFailed && (
              <p
                role="status"
                className="shrink-0 border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground"
              >
                The 3D model is unavailable. Your draft is retained; continue with the 2D map and
                named structures.
              </p>
            )}
            <div
              className="relative isolate min-h-0 flex-1 overflow-hidden"
              aria-label="Anatomical viewport"
            >
              {map ? (
                <div className="h-full min-h-0 overflow-auto pb-28">{mapView}</div>
              ) : active ? (
                <AnatomyViewport
                  layer={layer}
                  selected={selection}
                  isolate={isolate}
                  focus={cameraFocus}
                  findings={findings}
                  annotate={annotate && !readOnly}
                  onSelect={select}
                  onFindingSelect={focusFinding}
                  onAnchor={add}
                  view={view}
                  reset={reset}
                  zoom={zoom}
                  onFailure={failure}
                  fallback={mapView}
                />
              ) : (
                <p className="p-5 text-sm text-muted-foreground">
                  Model paused while this tab is hidden.
                </p>
              )}
              {!map && (
                <div
                  className="absolute top-4 left-4 z-10 grid gap-0.5 rounded-xl border border-border bg-card p-1 shadow-sm"
                  aria-label="Camera controls"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Zoom in"
                    onClick={() => setZoom((value) => value + 1)}
                  >
                    <Plus />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Zoom out"
                    onClick={() => setZoom((value) => value - 1)}
                  >
                    <Minus />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Reset camera"
                    onClick={resetView}
                  >
                    <RotateCcw />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Fit model to view"
                    onClick={resetView}
                  >
                    <LocateFixed />
                  </Button>
                </div>
              )}
              <div className="pointer-events-none absolute top-5 right-4 z-10 rounded-md bg-card/90 px-2.5 py-1.5 text-[10px] text-muted-foreground">
                <span className="capitalize">{view}</span> view · patient sides
                {cameraFocus && (
                  <span role="status" className="mt-1 block max-w-44 text-foreground">
                    Focused on {structures.find((value) => value.id === cameraFocus)?.label}
                  </span>
                )}
              </div>
              {annotate && (
                <p
                  role="status"
                  className="bg-teal-wash pointer-events-none absolute inset-x-14 top-16 z-10 mx-auto max-w-xs rounded-lg border border-teal-ink/20 px-3 py-2 text-center text-xs text-teal-ink"
                >
                  {map
                    ? "Select a named structure, then pin a map point."
                    : "Click a point on the model to add a finding."}
                </p>
              )}
              <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 bg-background/90">
                <ViewThumbnails layer={layer} view={view} onView={setView} />
                {!desktop && (
                  <div className="mr-4 mb-5 flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Open findings inspector"
                      onClick={() => {
                        setInspectorTab("findings");
                        setInspectorOpen(true);
                      }}
                    >
                      <PanelRight />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-1 border-t border-border/70 bg-card px-4 py-2 text-[10px] text-muted-foreground">
              <span>{annotate ? "Annotation mode" : "Drag to rotate · scroll to zoom"}</span>
              <a
                href="/models/anatomy-attribution.txt"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Z-Anatomy / BodyParts3D · reference model
              </a>
            </footer>
          </main>
          <EditorPanel
            desktop={desktop}
            open={inspectorOpen}
            onOpenChange={setInspectorOpen}
            title="Structure details & findings"
            description="Review anatomy, record findings or carry forward patient history."
            className="border-l border-border"
          >
            <AnatomyInspector
              current={current}
              findings={findings}
              focused={focused}
              tab={inspectorTab}
              onTab={setInspectorTab}
              onFocus={focusFinding}
              onAdd={() => add()}
              onRemove={() => {
                if (focused >= 0) {
                  entries.remove(focused);
                  setFocusKey(undefined);
                }
              }}
              readOnly={readOnly}
              isolate={isolate}
              onIsolate={() => setIsolate(!isolate)}
              patientId={patientId}
              onCarry={carry}
            />
          </EditorPanel>
        </div>
        {(!desktop || assistantOpen) && (
          <EditorPanel
            desktop={desktop}
            open={!desktop && assistantDrawer && active}
            onOpenChange={setAssistantDrawer}
            ownHeader
            title="Medframe AI"
            description="Unconnected assistant interface preview."
            className="border-l border-border shadow-[-4px_0_18px_-12px_rgba(16,42,67,0.15)]"
          >
            <AnatomyAssistant
              key={patientId}
              onClose={() => (desktop ? setAssistantOpen(false) : setAssistantDrawer(false))}
            />
          </EditorPanel>
        )}
      </div>
    </section>
  );
}
