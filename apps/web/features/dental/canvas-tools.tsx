"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  MousePointer2,
  MessageSquare,
  PencilSimpleIcon,
  Ruler,
  EyeIcon,
  EyeSlashIcon,
  Maximize2,
  Minimize2,
  Rotate3d,
  ZoomIn,
  Hand,
  RotateCcw,
} from "@/components/icons";
import { FormSelect } from "@/features/patients/form-controls";
import type { AnnotationInteraction } from "./annotation-pins";
import type { DentalViewport } from "./use-dental-viewport";
import { VIEW_OPTIONS, type DentalView } from "./anatomy";

export function CanvasToolbar({
  viewport,
  annotations,
  onAnnotate,
}: {
  viewport: DentalViewport;
  annotations?: AnnotationInteraction;
  onAnnotate?: () => void;
}) {
  const id = useId();
  return (
    <div
      className="flex shrink-0 flex-wrap items-center justify-between gap-2"
      role="toolbar"
      aria-label="Dental tools"
    >
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1.5">
        {annotations && (
          <>
            <Button
              type="button"
              variant={annotations.tool === "select" ? "secondary" : "ghost"}
              aria-pressed={annotations.tool === "select"}
              onClick={() => annotations.onToolChange("select")}
            >
              <MousePointer2 />
              Select
            </Button>
            <Button
              type="button"
              variant={annotations.tool === "comment" ? "secondary" : "ghost"}
              disabled={!annotations.canComment}
              aria-pressed={annotations.tool === "comment"}
              onClick={() => annotations.onToolChange("comment")}
            >
              <MessageSquare />
              Comment
            </Button>
          </>
        )}
        <span title="Measurements are unavailable because this reference model is not dimensionally calibrated.">
          <Button type="button" variant="ghost" disabled>
            <Ruler />
            Measure
          </Button>
        </span>
        {onAnnotate && (
          <Button
            type="button"
            variant="ghost"
            disabled={!annotations?.canComment}
            onClick={onAnnotate}
          >
            <PencilSimpleIcon />
            Annotate
          </Button>
        )}
        <label
          htmlFor={`tooth-label-${id}`}
          className="mx-2 flex min-h-10 items-center gap-2 border-l border-border pl-3 text-xs"
        >
          <span>Show label</span>
          <Switch
            id={`tooth-label-${id}`}
            checked={viewport.showLabel}
            onCheckedChange={viewport.setShowLabel}
          />
        </label>
      </div>
      <div className="flex items-end gap-1.5">
        <div className="w-40">
          <FormSelect
            id={`camera-${id}`}
            label="Camera view"
            value={viewport.focus ? "selected" : viewport.view}
            onChange={(value) => {
              if (value === "selected" && viewport.focus)
                viewport.focusTooth(viewport.focus.tooth, viewport.focus.surface);
              else viewport.chooseView(value as DentalView);
              annotations?.onOpen(null);
            }}
            options={
              viewport.focus
                ? [{ value: "selected", label: "Selected tooth" }, ...VIEW_OPTIONS]
                : VIEW_OPTIONS
            }
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={viewport.showLabel ? "Hide tooth label" : "Show tooth label"}
          onClick={() => viewport.setShowLabel(!viewport.showLabel)}
        >
          {viewport.showLabel ? <EyeIcon /> : <EyeSlashIcon />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={viewport.expandedCanvas ? "Restore editor panels" : "Expand canvas"}
          aria-pressed={viewport.expandedCanvas}
          onClick={() => viewport.setExpandedCanvas(!viewport.expandedCanvas)}
        >
          {viewport.expandedCanvas ? <Minimize2 /> : <Maximize2 />}
        </Button>
      </div>
    </div>
  );
}

export function CanvasNavigation({
  viewport,
  onReset,
}: {
  viewport: DentalViewport;
  onReset: () => void;
}) {
  return (
    <div
      className="absolute top-1/2 right-3 z-10 hidden -translate-y-1/2 flex-col gap-1 rounded-lg border border-border bg-card p-1.5 shadow-sm sm:flex"
      role="toolbar"
      aria-label="Camera navigation"
    >
      {(
        [
          { value: "rotate", label: "Rotate", Icon: Rotate3d },
          { value: "zoom", label: "Zoom", Icon: ZoomIn },
          { value: "pan", label: "Pan", Icon: Hand },
        ] as const
      ).map(({ value, label, Icon }) => (
        <Button
          key={value}
          type="button"
          variant={viewport.navigation === value ? "secondary" : "ghost"}
          aria-pressed={viewport.navigation === value}
          className="grid h-14 gap-1 px-3 text-xs"
          onClick={() => viewport.setNavigation(value)}
        >
          <Icon className="mx-auto size-4" />
          {label}
        </Button>
      ))}
      <Button type="button" variant="ghost" className="grid h-14 gap-1 text-xs" onClick={onReset}>
        <RotateCcw className="mx-auto size-4" />
        Reset
      </Button>
      <div className="my-1 border-t border-border" />
      <Button
        type="button"
        variant="ghost"
        className="text-xs"
        onClick={() => viewport.chooseView("upper")}
      >
        Upper
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="text-xs"
        onClick={() => viewport.chooseView("lower")}
      >
        Lower
      </Button>
    </div>
  );
}
