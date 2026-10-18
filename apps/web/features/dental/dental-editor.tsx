"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/application/status-badge";
import { ClinicalEntry } from "@/components/application/clinical-entry";
import dynamic from "next/dynamic";
import { useRef, useState, type ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MessageSquare, MoreHorizontal, ExternalLink } from "@/components/icons";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { AnnotationComposer, AnnotationNote } from "./annotation-note";
import type { AnnotationInteraction, DentalTool, PendingPin } from "./annotation-pins";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { DentalReferenceDocument, DentalChartDocument } from "@/lib/graphql/generated";
import { z } from "zod";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState } from "@/features/patients/feedback";
import { FormSelect } from "@/features/patients/form-controls";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  dentalReferenceSchema,
  findingSchema,
  type EncounterForm,
} from "@/features/consultations/schema";
import { DentalChartGrid } from "./dental-chart-grid";
import { ToothHistory } from "./tooth-history";
import { DentalEditorHeader } from "./editor-header";
import { ToothNavigator } from "./tooth-navigator";
import { ToothIdentity, ToothSurfacePicker } from "./tooth-preview";
import { useDentalViewport } from "./use-dental-viewport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Dental3D = dynamic(() => import("./dental-3d"), {
  ssr: false,
  loading: () => <p role="status">Loading anatomical model…</p>,
});

export function DentalEditor({
  readOnly,
  patientId,
  encounterId,
  revisionId,
  active = true,
  patientName,
  onExit,
  actions,
  feedback,
  reason,
  encounterStatus,
  navigation,
  onPatientRecord,
}: {
  readOnly: boolean;
  patientId: string;
  encounterId: string;
  revisionId?: string | null;
  active?: boolean;
  patientName: string;
  onExit: () => void;
  actions: ReactNode;
  feedback: ReactNode;
  reason: string;
  encounterStatus: string;
  navigation: ReactNode;
  onPatientRecord: () => void;
}) {
  const { organizationId } = useWorkspace();
  const remote = useRemote(DentalReferenceDocument, { organizationId });
  const chart = useRemote(DentalChartDocument, {
    organizationId,
    patientId,
    encounterId: revisionId ? null : encounterId,
    revisionId,
  });
  const { control, register, setValue } = useFormContext<EncounterForm>();
  const findings = useFieldArray({ control, name: "content.findings" });
  const values = useWatch({ control, name: "content.findings" });
  const procedures = useWatch({ control, name: "content.procedures" });
  const savedChart = z
    .array(findingSchema.extend({ encounter_id: z.string().optional() }))
    .safeParse(chart.data?.dentalChart);
  const merged = new Map(
    (savedChart.success ? savedChart.data : [])
      .filter((finding) => revisionId || finding.encounter_id !== encounterId)
      .map((finding) => [finding.key, finding]),
  );
  values.forEach((finding) => merged.set(finding.key, finding));
  const displayFindings = Array.from(merged.values());
  const [selected, setSelected] = useState("16");
  const [selectedSurface, setSelectedSurface] = useState<string | null>(null);
  const [dentition, setDentition] = useState<"permanent" | "primary">("permanent");
  const [tool, setTool] = useState<DentalTool>("select");
  const [pending, setPending] = useState<PendingPin | null>(null);
  const [noteText, setNoteText] = useState("");
  const [activePin, setActivePin] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const viewport = useDentalViewport();
  const chartRef = useRef<HTMLDetailsElement | null>(null);
  const [chartOpen, setChartOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState("findings");
  function show2DChart() {
    setChartOpen(true);
    viewport.setExpandedCanvas(false);
  }
  function selectTooth(id: string) {
    setSelected(id);
    setSelectedSurface(null);
    setActivePin(null);
  }
  function changeDentition(value: "permanent" | "primary") {
    setDentition(value);
    selectTooth(value === "primary" ? "54" : "16");
  }
  function addFinding() {
    if (readOnly || findings.fields.length >= 80) return;
    setInspectorTab("findings");
    setInspectorOpen(true);
    findings.append({
      key: crypto.randomUUID(),
      tooth: selected,
      surfaces: selectedSurface ? [selectedSurface] : [],
      condition: "",
      severity: "unknown",
      status: "active",
      notes: "",
    });
  }
  const noteKey = `dental-note:${organizationId}:${encounterId}`;
  useUnsavedChanges(noteKey, !!pending && !!noteText.trim(), () => {
    setPending(null);
    setNoteText("");
    setActivePin(null);
  });
  function openPin(key: string | null) {
    const finding = displayFindings.find((item) => item.key === key);
    if (finding) setSelected(finding.tooth);
    setActivePin(key);
  }
  function renderNote(finding: (typeof displayFindings)[number] | null) {
    if (!finding)
      return (
        <AnnotationComposer
          value={noteText}
          onChange={setNoteText}
          disabled={readOnly || findings.fields.length >= 80}
          onCancel={() => {
            setPending(null);
            setNoteText("");
            setActivePin(null);
          }}
          onPost={() => {
            if (!pending || !noteText.trim() || readOnly || findings.fields.length >= 80) return;
            const key = crypto.randomUUID();
            findings.append({
              key,
              tooth: pending.tooth,
              surfaces: [],
              condition: "Pinned note",
              severity: "unknown",
              status: "active",
              notes: noteText.trim(),
              anchor: pending.anchor,
            });
            setPending(null);
            setNoteText("");
            setActivePin(key);
            setTool("select");
          }}
        />
      );
    const index = values.findIndex((item) => item.key === finding.key);
    const editable = index >= 0 && !readOnly;
    return (
      <AnnotationNote
        finding={finding}
        onChange={
          editable
            ? (notes) => setValue(`content.findings.${index}.notes`, notes, { shouldDirty: true })
            : undefined
        }
        onStatus={
          editable
            ? (status) =>
                setValue(`content.findings.${index}.status`, status, { shouldDirty: true })
            : undefined
        }
        onRemove={
          editable
            ? () => {
                findings.remove(index);
                setActivePin(null);
              }
            : undefined
        }
      />
    );
  }
  const annotations: AnnotationInteraction = {
    tool,
    canComment: !readOnly,
    pending,
    activeKey: activePin,
    onToolChange: (next) => {
      setTool(next);
      setActivePin(null);
    },
    onOpen: openPin,
    onPlace: (pin) => {
      if (readOnly || findings.fields.length >= 80) return;
      if (!pending) {
        setPending(pin);
        setNoteText("");
      }
      setActivePin("pending");
    },
    renderContent: renderNote,
  };
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  const parsed = dentalReferenceSchema.safeParse(remote.data.dentalReference);
  if (!parsed.success) return <p role="alert">The dental reference could not be loaded.</p>;
  const teeth = parsed.data.teeth.filter((tooth) => tooth.dentition === dentition);
  const current = teeth.find((tooth) => tooth.id === selected);
  return (
    <Dialog
      open={active}
      onOpenChange={(open) => {
        if (!open) onExit();
      }}
    >
      <DialogContent
        data-dental-editor="true"
        aria-label="Dental editor"
        showCloseButton={false}
        className="inset-0 top-0 left-0 z-50 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-none"
        aria-describedby="dental-editor-description"
      >
        <DentalEditorHeader
          patientName={patientName}
          reason={reason}
          status={encounterStatus}
          feedback={feedback}
          pending={!!pending}
          onExit={onExit}
          inspectorOpen={inspectorOpen}
          onInspector={() => setInspectorOpen(!inspectorOpen)}
          navigation={navigation}
          actions={
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" aria-label="More editor actions">
                    <MoreHorizontal />
                    <span className="hidden sm:inline">More actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[80]">
                  <DropdownMenuItem onSelect={onPatientRecord}>
                    <ExternalLink />
                    Patient record
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={show2DChart}>View 2D chart</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {actions}
            </>
          }
        />
        <div
          className={`relative grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] ${viewport.expandedCanvas ? "" : "lg:grid-cols-[248px_minmax(0,1fr)_340px] 2xl:grid-cols-[280px_minmax(0,1fr)_380px]"}`}
        >
          <div
            className={
              viewport.expandedCanvas
                ? "hidden"
                : "hidden min-h-0 border-r border-border bg-card lg:block"
            }
          >
            <ToothNavigator
              teeth={teeth}
              selected={selected}
              onSelect={selectTooth}
              dentition={dentition}
              onDentition={changeDentition}
              viewport={viewport}
            />
          </div>
          <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto bg-muted/30 p-3 xl:p-4">
            {active && (
              <Dental3D
                selected={selected}
                onSelect={(tooth, surface) => {
                  setSelected(tooth);
                  setSelectedSurface(surface ?? null);
                }}
                selectedSurface={selectedSurface}
                findings={displayFindings}
                dentition={dentition}
                editor
                annotations={annotations}
                workspace={viewport}
                onAnnotate={addFinding}
              />
            )}
            <details
              ref={chartRef}
              open={chartOpen || dentition === "primary"}
              onToggle={(event) => setChartOpen(event.currentTarget.open)}
              className="mt-2 shrink-0 rounded-lg border border-border bg-card px-3 py-1 text-xs"
            >
              <summary className="min-h-11 text-sm font-medium">
                2D tooth selector · keyboard alternative
              </summary>
              <div className="mt-3 max-h-64 overflow-y-auto">
                <div className="mb-3 lg:hidden">
                  <FormSelect
                    id="mobile-dentition"
                    label="Dentition"
                    value={dentition}
                    onChange={(value) => {
                      setDentition(value as typeof dentition);
                      setSelected(value === "primary" ? "54" : "16");
                    }}
                    options={[
                      { value: "permanent", label: "Permanent" },
                      { value: "primary", label: "Primary" },
                    ]}
                  />
                </div>{" "}
                <DentalChartGrid
                  teeth={teeth}
                  dentition={dentition}
                  selected={selected}
                  findings={displayFindings}
                  onSelect={(id) => {
                    setSelected(id);
                    setSelectedSurface(null);
                  }}
                />
              </div>
            </details>
          </div>
          <aside
            aria-label="Tooth inspector"
            className={`${viewport.expandedCanvas ? "hidden" : inspectorOpen ? "absolute inset-x-0 bottom-0 z-20 max-h-[60dvh] shadow-lg" : "hidden"} min-h-0 min-w-0 overflow-y-auto border-t border-border bg-card p-4 ${viewport.expandedCanvas ? "" : "lg:static lg:block lg:max-h-none lg:border-t-0 lg:border-l lg:shadow-none"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold">Tooth {selected}</h2>
                <p className="mt-1 text-sm text-muted-foreground capitalize">{current?.label}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="hidden xl:inline-flex"
                onClick={show2DChart}
              >
                View in 2D chart
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="lg:hidden"
                onClick={() => setInspectorOpen(false)}
              >
                Close details
              </Button>
            </div>
            <ToothIdentity tooth={current} />
            <span className="mb-5 inline-flex rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
              Selected · FDI {selected}
            </span>
            <Tabs value={inspectorTab} onValueChange={setInspectorTab} className="gap-4">
              <TabsList className="w-full">
                <TabsTrigger value="findings">Findings</TabsTrigger>
                <TabsTrigger value="treatments">Treatments</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="findings" forceMount className="data-[state=inactive]:hidden">
                {!readOnly && (
                  <Button
                    type="button"
                    className="mb-2 w-full"
                    onClick={addFinding}
                    disabled={findings.fields.length >= 80}
                  >
                    + Add finding for tooth {selected}
                  </Button>
                )}
                <h3 className="text-sm font-semibold">
                  Current findings (
                  {displayFindings.filter((item) => item.tooth === selected && !item.anchor).length}
                  )
                </h3>
                {displayFindings
                  .filter(
                    (item) =>
                      item.tooth === selected &&
                      !item.anchor &&
                      !values.some((value) => value.key === item.key),
                  )
                  .map((item) => (
                    <div key={item.key} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium">{item.condition}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {item.surfaces.join(", ") || "Whole tooth"} · {item.status}
                      </p>
                      {item.notes && <p className="mt-2 text-sm">{item.notes}</p>}
                    </div>
                  ))}
                <ToothSurfacePicker
                  tooth={current}
                  value={selectedSurface}
                  onChange={setSelectedSurface}
                />
                {!values.some((finding) => finding.tooth === selected) && (
                  <p className="text-sm text-muted-foreground">
                    No finding recorded for this tooth in this visit.
                  </p>
                )}
                <div className="grid gap-5">
                  {findings.fields.map(
                    (field, index) =>
                      values[index]?.tooth === selected &&
                      !values[index]?.anchor && (
                        <ClinicalEntry
                          key={field.id}
                          title={`Finding · tooth ${selected}`}
                          summary={values[index]?.condition ?? ""}
                          status={values[index]?.status ?? "active"}
                          path={`content.findings.${index}`}
                          readOnly={readOnly}
                          onRemove={() => findings.remove(index)}
                        >
                          <div className="grid gap-4">
                            <FormField id={`finding-${index}`} label="Finding or condition">
                              <Input
                                id={`finding-${index}`}
                                {...register(`content.findings.${index}.condition`)}
                                maxLength={120}
                              />
                            </FormField>
                            <div>
                              <p id={`surfaces-${index}`} className="mb-3 text-sm font-medium">
                                Affected surfaces (optional)
                              </p>
                              <div
                                className="flex flex-wrap gap-4"
                                role="group"
                                aria-labelledby={`surfaces-${index}`}
                              >
                                {current?.surfaces.map((surface) => (
                                  <label
                                    key={surface}
                                    className="flex min-h-11 items-center gap-2 text-sm"
                                  >
                                    <Checkbox
                                      checked={values[index].surfaces.includes(surface)}
                                      onCheckedChange={(checked) =>
                                        setValue(
                                          `content.findings.${index}.surfaces`,
                                          checked === true
                                            ? [...values[index].surfaces, surface]
                                            : values[index].surfaces.filter(
                                                (value) => value !== surface,
                                              ),
                                          { shouldDirty: true },
                                        )
                                      }
                                    />
                                    {surface}
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <FormSelect
                                id={`severity-${index}`}
                                label="Severity"
                                value={values[index].severity}
                                onChange={(value) =>
                                  setValue(
                                    `content.findings.${index}.severity`,
                                    value as (typeof values)[number]["severity"],
                                    { shouldDirty: true },
                                  )
                                }
                                options={["unknown", "mild", "moderate", "severe"].map((value) => ({
                                  value,
                                  label: value,
                                }))}
                              />
                              <FormSelect
                                id={`finding-status-${index}`}
                                label="Finding status"
                                value={values[index].status}
                                onChange={(value) =>
                                  setValue(
                                    `content.findings.${index}.status`,
                                    value as (typeof values)[number]["status"],
                                    { shouldDirty: true },
                                  )
                                }
                                options={["active", "resolved", "historical"].map((value) => ({
                                  value,
                                  label: value,
                                }))}
                              />
                            </div>
                            <FormField
                              id={`finding-notes-${index}`}
                              label="Finding notes (optional)"
                            >
                              <Input
                                id={`finding-notes-${index}`}
                                {...register(`content.findings.${index}.notes`)}
                                maxLength={500}
                              />
                            </FormField>
                            {!readOnly && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => findings.remove(index)}
                              >
                                Remove finding
                              </Button>
                            )}
                          </div>
                        </ClinicalEntry>
                      ),
                  )}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  {values.length} finding{values.length === 1 ? "" : "s"} recorded in this visit.
                  Select another tooth to review its findings.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  The chart summarizes up to five saved findings per tooth. Preserved visit history
                  contains the complete evidence.
                </p>
              </TabsContent>
              <TabsContent value="treatments">
                <h3 className="mb-3 font-medium">Procedures for tooth {selected}</h3>
                <p className="mb-4 text-xs leading-5 text-muted-foreground">
                  This visit’s recorded procedures. Proposed care remains separate from completed
                  care.
                </p>
                {procedures
                  .filter((item) => item.tooth === selected)
                  .map((item, index) => (
                    <div
                      key={index}
                      className="mb-3 grid gap-2 rounded-md border border-border p-3"
                    >
                      <p className="text-sm font-medium">{item.description}</p>
                      <StatusBadge value={item.status} />
                      <p className="text-xs text-muted-foreground">
                        {item.surfaces.join(", ") || "Whole tooth"}
                      </p>
                    </div>
                  ))}
                {!procedures.some((item) => item.tooth === selected) && (
                  <p className="text-sm leading-6 text-muted-foreground">
                    No procedure recorded for this tooth in this visit. Add proposed or completed
                    care in the consultation Procedures tab.
                  </p>
                )}
              </TabsContent>
              <TabsContent value="notes">
                {" "}
                <section aria-label="Pinned notes" className="mb-5 border-b border-border pb-4">
                  <h3 className="mb-3 flex items-center gap-2 font-medium">
                    <MessageSquare className="size-4" />
                    Pinned notes
                  </h3>
                  {displayFindings
                    .filter((item) => item.tooth === selected && item.anchor)
                    .map((item) => (
                      <Button
                        type="button"
                        key={item.key}
                        variant="ghost"
                        className="mb-2 h-auto w-full justify-start py-3 text-left whitespace-normal"
                        onClick={() => {
                          openPin(item.key);
                          setInspectorOpen(false);
                        }}
                      >
                        <span className="grid gap-1">
                          <span className="line-clamp-2 text-sm">
                            {item.notes || item.condition}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.status} ·{" "}
                            {item.anchor?.asset === "dundee-molar26-v1"
                              ? "Detailed molar"
                              : "Full arch"}
                          </span>
                        </span>
                      </Button>
                    ))}
                  {!displayFindings.some((item) => item.tooth === selected && item.anchor) && (
                    <p className="text-xs leading-5 text-muted-foreground">
                      {readOnly
                        ? "No pinned notes on this tooth."
                        : "Choose Comment, then click a point on the tooth to add a note."}
                    </p>
                  )}
                </section>
              </TabsContent>
              <TabsContent value="history">
                <ToothHistory
                  key={`${patientId}:${selected}`}
                  patientId={patientId}
                  tooth={selected}
                />
              </TabsContent>
            </Tabs>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
