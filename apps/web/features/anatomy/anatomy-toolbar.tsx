"use client";
import {
  MousePointer2,
  MapPin,
  Ruler,
  Layers,
  RotateCcw,
  Expand,
  Minimize,
  SlidersHorizontal,
  Bot,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnatomyCamera } from "./schema";
export function AnatomyToolbar({
  annotate,
  onAnnotate,
  readOnly,
  view,
  onView,
  onReset,
  expanded,
  onExpand,
  assistantOpen,
  onAssistant,
  onNavigator,
  onInspector,
  desktop,
}: {
  annotate: boolean;
  onAnnotate: (value: boolean) => void;
  readOnly: boolean;
  view: AnatomyCamera;
  onView: (value: AnatomyCamera) => void;
  onReset: () => void;
  expanded: boolean;
  onExpand: () => void;
  assistantOpen: boolean;
  onAssistant: () => void;
  onNavigator: () => void;
  onInspector: () => void;
  desktop: boolean;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-border/70 bg-card/85 px-3 py-3 sm:px-5 [&_button]:h-10 [&_button]:px-3 [&_button]:text-xs"
      aria-label="Anatomy tools"
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-1 sm:gap-2">
        {!desktop && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Open anatomy navigator"
            onClick={onNavigator}
          >
            <PanelLeft />
          </Button>
        )}
        <Button
          type="button"
          variant={annotate ? "outline" : "secondary"}
          aria-pressed={!annotate}
          onClick={() => onAnnotate(false)}
          className="shrink-0"
        >
          <MousePointer2 />
          Select
        </Button>
        <Button
          type="button"
          variant={annotate ? "secondary" : "outline"}
          aria-pressed={annotate}
          disabled={readOnly}
          onClick={() => onAnnotate(true)}
          className="shrink-0"
        >
          <MapPin />
          Annotate
        </Button>
        <span
          title="Measurement is unavailable: this reference is not calibrated"
          className="hidden shrink-0 min-[1500px]:block"
        >
          <Button type="button" variant="outline" disabled>
            <Ruler />
            Measure
          </Button>
        </span>
        <span
          title="Cross-section is not available for these surface models"
          className="hidden shrink-0 min-[1660px]:block"
        >
          <Button type="button" variant="outline" disabled>
            <Layers />
            Cross-section
          </Button>
        </span>
        <Button
          type="button"
          variant="ghost"
          className="hidden shrink-0 sm:inline-flex"
          onClick={onReset}
        >
          <RotateCcw />
          <span className="hidden min-[1500px]:inline">Reset view</span>
          <span className="min-[1500px]:hidden">Reset</span>
        </Button>
        <Select value={view} onValueChange={(value) => onView(value as AnatomyCamera)}>
          <SelectTrigger aria-label="Camera view" className="h-11 w-32 shrink-0 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[90]">
            {["front", "back", "left", "right"].map((value) => (
              <SelectItem key={value} value={value}>
                {value[0].toUpperCase() + value.slice(1)} view
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex shrink-0 items-center gap-1 border-l border-border pl-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={expanded ? "Exit full screen" : "Expand anatomy editor"}
          onClick={onExpand}
        >
          {expanded ? <Minimize /> : <Expand />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Open structure details"
          onClick={onInspector}
        >
          {desktop ? <SlidersHorizontal /> : <PanelRight />}
        </Button>
        {!assistantOpen && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open AI sidebar"
            onClick={onAssistant}
          >
            <Bot />
          </Button>
        )}
      </div>
    </div>
  );
}
