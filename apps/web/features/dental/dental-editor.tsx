"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/application/status-badge";
import { ClinicalEntry } from "@/components/application/clinical-entry";
import dynamic from "next/dynamic";
import { useState } from "react";
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
}: {
  readOnly: boolean;
  patientId: string;
  encounterId: string;
  revisionId?: string | null;
  active?: boolean;
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
  const [show3D, setShow3D] = useState(true);
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  const parsed = dentalReferenceSchema.safeParse(remote.data.dentalReference);
  if (!parsed.success) return <p role="alert">The dental reference could not be loaded.</p>;
  const teeth = parsed.data.teeth.filter((tooth) => tooth.dentition === dentition);
  const current = teeth.find((tooth) => tooth.id === selected);
  return (
    <section aria-labelledby="dentalHeading">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="dentalHeading" className="text-xl font-semibold">
            Dental chart
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            FDI notation, viewed from the patient’s perspective. Draft findings become history after
            finalization.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          aria-expanded={show3D}
          onClick={() => setShow3D(!show3D)}
        >
          {show3D ? "Hide 3D view" : "Show 3D view"}
        </Button>
      </div>
      <div className="mb-5 max-w-xs">
        <FormSelect
          id="dentition"
          label="Dentition"
          value={dentition}
          onChange={(value) => {
            setDentition(value as typeof dentition);
            setSelectedSurface(null);
            setSelected(value === "primary" ? "54" : "16");
          }}
          options={[
            { value: "permanent", label: "Permanent teeth" },
            { value: "primary", label: "Primary teeth" },
          ]}
        />
      </div>
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {show3D && active && (
            <Dental3D
              selected={selected}
              onSelect={(tooth, surface) => {
                setSelected(tooth);
                setSelectedSurface(surface ?? null);
              }}
              selectedSurface={selectedSurface}
              findings={displayFindings}
              dentition={dentition}
            />
          )}
          <details
            open={!show3D || dentition === "primary"}
            className="mt-4 rounded-lg border border-border bg-card p-3"
          >
            <summary className="min-h-11 text-sm font-medium">
              2D tooth selector · keyboard alternative
            </summary>
            <div className="mt-3">
              {" "}
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
        <div className="min-w-0 rounded-lg border border-border bg-card p-4 xl:sticky xl:top-40">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">
              Tooth {selected}: {current?.label}
            </p>
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                disabled={findings.fields.length >= 80}
                onClick={() =>
                  findings.append({
                    key: crypto.randomUUID(),
                    tooth: selected,
                    surfaces: selectedSurface ? [selectedSurface] : [],
                    condition: "",
                    severity: "unknown",
                    status: "active",
                    notes: "",
                  })
                }
              >
                Add finding for tooth {selected}
              </Button>
            )}
          </div>
          <div className="mb-4 grid gap-2 border-b border-border pb-4">
            <h3 className="text-xs font-medium text-muted-foreground">Recorded context</h3>
            {displayFindings
              .filter((item) => item.tooth === selected)
              .map((item) => (
                <p key={item.key} className="text-xs leading-5">
                  {item.condition} · {item.status} · {item.surfaces.join(", ") || "Whole tooth"}
                </p>
              ))}
            {!displayFindings.some((item) => item.tooth === selected) && (
              <p className="text-xs leading-5 text-muted-foreground">
                No findings recorded. This does not establish a healthy tooth.
              </p>
            )}
          </div>
          <Tabs defaultValue="findings" className="gap-4">
            <TabsList className="w-full">
              <TabsTrigger value="findings">Findings</TabsTrigger>
              <TabsTrigger value="treatments">Treatments</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="findings" forceMount className="data-[state=inactive]:hidden">
              {!values.some((finding) => finding.tooth === selected) && (
                <p className="text-sm text-muted-foreground">
                  No finding recorded for this tooth in this visit.
                </p>
              )}
              <div className="grid gap-5">
                <div className="max-w-xs">
                  <FormSelect
                    id="selectedSurface"
                    label="Selected tooth surface"
                    value={selectedSurface ?? "whole"}
                    onChange={(surface) => setSelectedSurface(surface === "whole" ? null : surface)}
                    options={[
                      { value: "whole", label: "Whole tooth" },
                      ...(current?.surfaces ?? []).map((value) => ({ value, label: value })),
                    ]}
                  />
                </div>
                {findings.fields.map(
                  (field, index) =>
                    values[index]?.tooth === selected && (
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
                          <FormField id={`finding-notes-${index}`} label="Finding notes (optional)">
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
                  <div key={index} className="mb-3 grid gap-2 rounded-md border border-border p-3">
                    <p className="text-sm font-medium">{item.description}</p>
                    <StatusBadge value={item.status} />
                    <p className="text-xs text-muted-foreground">
                      {item.surfaces.join(", ") || "Whole tooth"}
                    </p>
                  </div>
                ))}
              {!procedures.some((item) => item.tooth === selected) && (
                <p className="text-sm leading-6 text-muted-foreground">
                  No procedure recorded for this tooth in this visit. Add proposed or completed care
                  in the consultation Procedures tab.
                </p>
              )}
            </TabsContent>
            <TabsContent value="history">
              <ToothHistory
                key={`${patientId}:${selected}`}
                patientId={patientId}
                tooth={selected}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}
