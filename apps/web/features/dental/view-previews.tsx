"use client";

import Image from "next/image";
import { ToothPreview } from "./tooth-preview";
import type { DentalViewport } from "./use-dental-viewport";
import type { DentalView } from "./anatomy";

const views: { value: DentalView; label: string }[] = [
  { value: "front", label: "Front view" },
  { value: "upper", label: "Upper occlusal" },
  { value: "lower", label: "Lower occlusal" },
  { value: "left", label: "Left lateral" },
  { value: "right", label: "Right lateral" },
];
export function ViewPreviews({
  viewport,
  selected,
  onChoose,
}: {
  viewport: DentalViewport;
  selected: string;
  onChoose: () => void;
}) {
  return (
    <div
      className="flex shrink-0 gap-2 overflow-x-auto pb-1"
      role="group"
      aria-label="View previews"
    >
      {views.map(({ value, label }) => (
        <button
          type="button"
          key={value}
          aria-pressed={viewport.view === value && !viewport.isolate && !viewport.focus}
          onClick={() => {
            viewport.chooseView(value);
            onChoose();
          }}
          className={`grid min-w-[100px] flex-1 place-items-center gap-1 rounded-lg border bg-card p-2 text-xs font-medium outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary ${viewport.view === value && !viewport.isolate && !viewport.focus ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted"}`}
        >
          <Image
            src={`/models/dental-previews/view-${value}.png`}
            alt=""
            width={240}
            height={160}
            unoptimized
            className="h-16 w-full object-contain"
          />
          <span className="whitespace-nowrap">{label}</span>
        </button>
      ))}
      <button
        type="button"
        aria-pressed={viewport.isolate}
        onClick={() => {
          viewport.setReference(false);
          viewport.setIsolate(true);
          onChoose();
        }}
        className={`grid min-w-[100px] flex-1 place-items-center gap-1 rounded-lg border bg-card p-2 text-xs font-medium outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary ${viewport.isolate ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted"}`}
      >
        <ToothPreview tooth={selected} className="h-16 w-full" />
        <span className="whitespace-nowrap">Isolated tooth</span>
      </button>
    </div>
  );
}
