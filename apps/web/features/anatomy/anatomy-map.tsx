"use client";
import type { AnatomyAnchor, AnatomyCamera } from "./schema";
export function AnatomyMap({
  view,
  onAnchor,
  enabled,
}: {
  view: AnatomyCamera;
  onAnchor?: (anchor: AnatomyAnchor) => void;
  enabled: boolean;
}) {
  return (
    <div className="grid h-full min-h-80 place-items-center p-4">
      <svg
        viewBox="0 0 240 420"
        aria-label={`${view} anatomical reference map; choose a named structure in the navigator`}
        role="img"
        className="h-full max-h-[440px] w-full text-muted-foreground"
        onClick={(event) => {
          if (!enabled || !onAnchor) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          // Preserve the SVG's actual letterboxed coordinate space.
          const scale = Math.min(bounds.width / 240, bounds.height / 420);
          const x = (event.clientX - bounds.left - (bounds.width - 240 * scale) / 2) / scale / 240;
          const y = (event.clientY - bounds.top - (bounds.height - 420 * scale) / 2) / scale / 420;
          if (x >= 0 && x <= 1 && y >= 0 && y <= 1)
            onAnchor({ kind: "map", reference_version: 1, view, point: [x, y] });
        }}
      >
        <title>Illustrative {view} body map</title>
        <path
          d="M120 18c-17 0-26 13-26 29 0 14 8 26 16 29v15l-33 10-22 76-18 47 13 6 24-45 13-35-2 91 9 149h18l8-139 8 139h18l9-149-2-91 13 35 24 45 13-6-18-47-22-76-33-10V76c8-3 16-15 16-29 0-16-9-29-26-29Z"
          fill="currentColor"
          fillOpacity=".12"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M120 100v137M89 154h62M88 237h64"
          fill="none"
          stroke="currentColor"
          strokeDasharray="4 5"
        />
        <text x="14" y="24" fontSize="11" fill="currentColor">
          {view === "front" ? "Patient right" : view === "back" ? "Patient left" : `${view} side`}
        </text>
        <text x="165" y="24" fontSize="11" fill="currentColor">
          {view === "front" ? "Patient left" : view === "back" ? "Patient right" : ""}
        </text>
      </svg>
      <p className="max-w-prose text-center text-xs text-muted-foreground">
        Illustrative map. Select the named structure first; a map point does not identify tissue or
        confirm a diagnosis.
      </p>
    </div>
  );
}
