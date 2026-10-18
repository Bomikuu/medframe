# Dundee dental assets

Both source assets are by **University of Dundee, School of Dentistry**.

- [Permanent Dentition](https://sketchfab.com/3d-models/permanent-dentition-2f69d7b59c3e4a6a8bcae041bd8e591b)
- [Maxillary First Molar (Left)](https://sketchfab.com/3d-models/maxillary-first-molar-e719a474ef7e4bd7abec508f85f1e984)

License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). Author attribution, source and license links, and modification notices are retained in the GLB metadata, this manifest, and the viewer. Commercial use is allowed by the source license; no endorsement by the author is implied.

Source files were already present in the user's Downloads folder. The embedded author/license/source metadata matches the two public Sketchfab model records, inspected October 19, 2026. The official unauthenticated download endpoint returns HTTP 401; no download restriction was bypassed and no protected viewer files were scraped. Only these two assets are used; none of the remaining collection models was downloaded.

## Preparation

Run `uv run --project services/api python scripts/prepare-dental-assets.py --source-dir /path/to/downloads` with the original `permanent_dentition.glb` and `maxillary_first_molar.glb`. The importer requires the recorded SHA-256 source hashes so a changed export cannot silently inherit an unreviewed mapping.

- Permanent dentition: 33 source meshes, of which 32 are individual tooth-sized meshes. `polySurface7_blinn18_0` is a tiny four-vertex export fragment, omitted from the prepared scene. All 32 remaining meshes receive explicit FDI identifiers, jaw, anatomical side/name and original node metadata. Mapping uses the individual source nodes and source arrangement, never mesh array positions at runtime.
- The source's anatomical left is positive X, anterior is positive Z and superior is positive Y after its original transforms. The supplied tooth names are not reliable as the sole side identity: several mirrored/paired objects retain the same source labels. The manifest records the explicit mapping.
- The individual molar is UL6, **FDI 26**. It is an optional detailed reference for that tooth, not a generic replacement cloned across the arch.
- Geometry, vertex positions, normals, UVs, indices and tooth transforms are preserved. No primitive teeth, new mirroring, arbitrary tooth stretching, procedural crowns, or root reshaping are introduced.
- Embedded arch textures are resized from 17 × 4096² to at most 512². Molar textures are resized from 2 × 4096² to at most 1024². This retains UV mapping and recognizable source morphology while avoiding the original texture allocation. The model is fitted by its bounds at runtime; individual teeth are not scaled to fit an invented arch.
- A restrained roughness floor and temporary emissive state feedback are applied to cloned runtime materials. Source materials/maps remain cached and unchanged. Runtime clones are disposed on teardown.

## Clinical limits

These are educational reference assets derived by Dundee from CT data. They are not patient-specific scans, calibrated dimensions, or independently clinically validated Medframe FDI mapping. Clinical review is still required before relying on the visualization for care decisions. No clinical diagnosis is embedded in an asset.

No reliable clinical surface segmentation, gingiva, implant, crown variants, or primary dentition is supplied. Surface recording uses the linked conventional 2D selector. Existing findings and exact finalized snapshots remain authoritative. Whole-tooth record annotations do not pretend to locate caries, restorations or fractures on a precise mesh surface. An exact active "missing tooth" record hides the tooth; reference anatomy can reveal it as an explicitly educational view without changing the record. Primary dentition retains its correct 20-tooth 2D chart and does not shrink permanent anatomy.

## Tooth and camera previews

`apps/web/public/models/dental-previews/` contains 32 transparent individual-tooth PNGs and five full-arch camera views rendered from the existing prepared Permanent Dentition GLB. The tooth geometry, source transforms and materials are retained. Previews are generated with `node scripts/render-dental-previews.mjs`; the same source/author/CC BY 4.0 attribution and modification notice are embedded in each PNG and recorded in `assets/dental/previews.json`. These are educational identity/camera previews, not patient images, calibrated measurements or segmented clinical surfaces. No additional collection models were downloaded. Surface buttons reuse the selected tooth's identity preview; their labels are explicitly assigned by the clinician, not inferred from the picture.
