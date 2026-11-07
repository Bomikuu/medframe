# Medframe illustrations

Supplied by the project owner on October 22, 2026, from the local
`medframe-illustrations-individual/medframe-illustrations/svg-editable` pack.
The separate `medframe-illustrations-webp/webp` pack contains raster alternatives.

These are simplified, automatically traced vector paths. They are not the original
editable source artwork; fine details differ from the raster originals.

The 14 inspected SVGs contain paths only. Their original path coordinates and view
boxes are retained. Source title/style declarations were replaced by an `artwork`
group and per-path `fill="var(--mf-…, fallback)"` attributes so multiple instances
can inherit their own palette without global class or title-ID collisions.
No scripts, foreign objects, embedded raster images or remote references are included.

Use `MedframeIllustration` from `components/illustrations/medframe-illustration.tsx`.
It renders a same-origin SVG reference with a stable view box; paths are loaded as
assets rather than bundled into application JavaScript. The illustration is
decorative and hidden from assistive technology; adjacent headings and instructions
must convey its meaning.

The shared `.medframe-illustration` palette follows the clinic's primary and teal
colors. Override `--mf-*` properties on a containing element for other variants;
the component also accepts an `accent` override. `palette.css` records all original
palette values for reference and is not globally imported. Skin and paper colors
keep their source values. These illustrations do not replace clinical images,
anatomical models, patient portraits or uploaded clinic logos.

The exact user-uploaded Medframe brand mark is stored separately at
`public/brand/medframe-logo.webp`. It is a transparent raster WebP, not a vector.
