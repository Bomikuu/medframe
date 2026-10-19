"use client";
import Image from "next/image";
import { Plus, Focus, MoreHorizontal, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { Structure } from "./asset-registry";
import { groupLabel } from "./navigation";
import type { AnatomyFinding } from "./schema";
import { FindingForm } from "./finding-form";
import { PatientAnatomy } from "./patient-anatomy";
export type InspectorTab = "details" | "findings" | "history";
export function AnatomyInspector({
  current,
  findings,
  focused,
  tab,
  onTab,
  onFocus,
  onAdd,
  onRemove,
  readOnly,
  isolate,
  onIsolate,
  patientId,
  onCarry,
}: {
  current: Structure;
  findings: AnatomyFinding[];
  focused: number;
  tab: InspectorTab;
  onTab: (value: InspectorTab) => void;
  onFocus: (key: string) => void;
  onAdd: () => void;
  onRemove: () => void;
  readOnly: boolean;
  isolate: boolean;
  onIsolate: () => void;
  patientId?: string;
  onCarry: (finding: AnatomyFinding) => void;
}) {
  const selectedFindings = findings
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => value.structure_id === current.id);
  return (
    <div className="flex h-full min-h-0 flex-col" aria-label="Selected structure inspector">
      <div className="shrink-0 border-b border-border px-4 pt-5 pb-4">
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">Selected structure</p>
            <h2 className="mt-3 text-sm leading-6 font-semibold">{current.label}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {groupLabel(current)} · Patient {current.side}
            </p>
          </div>
          <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/30">
            <Image
              src={`/models/anatomy-previews/${current.layer}-front.png`}
              alt={`${current.layer === "body" ? "Body" : "Skeleton"} layer reference`}
              width={64}
              height={80}
              className="h-full w-full object-contain"
              unoptimized
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            variant={isolate ? "secondary" : "outline"}
            className="h-10 min-w-0 flex-1 text-xs"
            aria-pressed={isolate}
            onClick={onIsolate}
          >
            <Focus className="size-3.5" />
            {isolate ? "Show full model" : "Isolate structure"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10"
                aria-label="Selected structure actions"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="z-[90]" align="end">
              <DropdownMenuItem onSelect={() => onTab("history")}>
                View patient anatomy history
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onTab("findings")}>
                Review consultation findings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="shrink-0 px-4 pt-3">
        <Tabs value={tab} onValueChange={(value) => onTab(value as InspectorTab)}>
          <TabsList className="w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="findings">Findings ({findings.length})</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "history" ? (
          patientId ? (
            <PatientAnatomy patientId={patientId} onCarry={readOnly ? undefined : onCarry} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Confirm the patient to load anatomy history. No history has been reviewed.
            </p>
          )
        ) : (
          <>
            {tab === "details" && (
              <dl className="grid gap-4 pb-5 text-xs leading-5">
                <div>
                  <dt className="text-muted-foreground">Anatomical region</dt>
                  <dd className="mt-1 font-medium">{current.label}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Patient side</dt>
                  <dd className="mt-1 capitalize">{current.side}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">System</dt>
                  <dd className="mt-1">
                    {current.layer === "body" ? "Surface anatomy" : "Skeletal anatomy"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Reference model</dt>
                  <dd className="mt-1 wrap-anywhere">{current.asset_version}</dd>
                </div>
              </dl>
            )}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
              <h3 className="text-xs font-semibold">
                {tab === "details"
                  ? `Current findings (${selectedFindings.length})`
                  : `Consultation findings (${findings.length}/60)`}
              </h3>
              {!readOnly && (
                <Button
                  type="button"
                  size="sm"
                  disabled={findings.length >= 60}
                  className="h-8 gap-1 px-2 text-[11px]"
                  onClick={onAdd}
                >
                  <Plus className="size-3.5" />
                  Add finding
                </Button>
              )}
            </div>
            <ul className="grid gap-2">
              {(tab === "details"
                ? selectedFindings
                : findings.map((value, index) => ({ value, index }))
              ).map(({ value, index }) => (
                <li key={value.key}>
                  <button
                    type="button"
                    aria-pressed={focused === index}
                    onClick={() => onFocus(value.key)}
                    className="aria-pressed:bg-teal-wash/30 flex min-h-16 w-full items-start gap-2.5 rounded-xl border border-border bg-card px-3 py-3 text-left transition-colors hover:bg-muted/60 aria-pressed:border-teal-ink/40"
                  >
                    <span
                      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${value.status === "active" ? "bg-teal-ink" : "bg-muted-foreground"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs leading-5 font-medium wrap-anywhere">
                        {index + 1}. {value.description || "Complete finding description"}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground capitalize">
                        {value.status.replaceAll("_", " ")} · {value.severity}
                      </span>
                    </span>
                    {value.anchor && (
                      <MapPin className="mt-1 size-3 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
            {!(tab === "details" ? selectedFindings.length : findings.length) && (
              <p className="rounded-xl border border-dashed border-border p-4 text-xs leading-5 text-muted-foreground">
                No findings recorded here. Select Annotate to pin a point, or add a finding for this
                structure.
              </p>
            )}
            {focused >= 0 && (
              <div className="mt-5 border-t border-border pt-5">
                <FindingForm key={findings[focused].key} index={focused} readOnly={readOnly} />
                {!readOnly && !findings[focused].source_revision_id && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-4 w-full text-xs text-destructive"
                    onClick={onRemove}
                  >
                    <X />
                    Remove draft finding
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
