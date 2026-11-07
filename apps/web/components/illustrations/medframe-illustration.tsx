import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import catalog from "./catalog.json";

export type IllustrationName = keyof typeof catalog;

/** Same-origin SVG instances inherit the palette without shipping paths in JavaScript. */
export function MedframeIllustration({
  name,
  className,
  accent,
}: {
  name: IllustrationName;
  className?: string;
  accent?: string;
}) {
  return (
    <svg
      viewBox={catalog[name]}
      aria-hidden="true"
      focusable="false"
      className={cn("medframe-illustration block h-auto max-w-full", className)}
      style={accent ? ({ "--mf-teal": accent } as CSSProperties) : undefined}
    >
      <use href={`/illustrations/medframe/${name}.svg#artwork`} />
    </svg>
  );
}
