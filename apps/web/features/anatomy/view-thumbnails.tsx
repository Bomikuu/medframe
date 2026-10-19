"use client";
import Image from "next/image";
import type { AnatomyCamera, AnatomyLayer } from "./schema";
export function ViewThumbnails({
  layer,
  view,
  onView,
}: {
  layer: AnatomyLayer;
  view: AnatomyCamera;
  onView: (view: AnatomyCamera) => void;
}) {
  return (
    <div
      className="flex shrink-0 items-end gap-2 px-4 pt-2 pb-3 sm:gap-3 sm:px-5"
      aria-label="Anatomy camera presets"
    >
      {(["front", "back", "left", "right"] as const).map((value) => (
        <button
          type="button"
          key={value}
          aria-pressed={view === value}
          aria-label={`${value[0].toUpperCase() + value.slice(1)} camera preset`}
          onClick={() => onView(value)}
          className="group grid w-[58px] shrink-0 justify-items-center gap-1.5 rounded-lg text-[11px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:text-teal-ink sm:w-[72px]"
        >
          <span className="grid h-[70px] w-full place-items-center overflow-hidden rounded-xl border border-border bg-card transition-colors group-hover:border-teal-ink/40 group-aria-pressed:border-teal-ink group-aria-pressed:ring-1 group-aria-pressed:ring-teal-ink sm:h-[90px]">
            <Image
              src={`/models/anatomy-previews/${layer}-${value}.png`}
              alt=""
              width={65}
              height={90}
              className="h-full w-auto object-contain"
              unoptimized
            />
          </span>
          <span className="capitalize">{value}</span>
        </button>
      ))}
    </div>
  );
}
