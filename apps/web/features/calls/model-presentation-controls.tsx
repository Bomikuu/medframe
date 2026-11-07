"use client";

import { useState } from "react";
import { Box, MonitorUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ModelPresentation } from "./use-model-presentation";

export function ModelPresentationControls({
  share,
  doctor,
}: {
  share: ModelPresentation;
  doctor: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!doctor) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={share.presentation?.active ? "secondary" : "ghost"}
          size="icon"
          className="size-11"
          aria-label="Present model"
          title="Present model"
          disabled={share.connection !== "ready"}
        >
          <MonitorUp aria-hidden className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <h2 className="text-sm font-semibold">Present a model</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Show a shared educational model. Private chart findings and notes stay in your clinical
          workspace.
        </p>
        <div className="mt-3 grid gap-2">
          {(
            [
              ["dental", "Dental model"],
              ["body", "Body anatomy"],
              ["skeleton", "Skeleton"],
            ] as const
          ).map(([model, label]) => (
            <Button
              key={model}
              variant="outline"
              className="justify-start"
              disabled={share.presentation?.active && share.presentation.model === model}
              onClick={() => {
                share.start(model);
                setOpen(false);
              }}
            >
              <Box aria-hidden className="size-4" />
              {label}
            </Button>
          ))}
          {share.presentation?.active && (
            <Button
              variant="secondary"
              onClick={() => {
                share.stop();
                setOpen(false);
              }}
            >
              <Square aria-hidden className="size-4" />
              Stop presenting
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
