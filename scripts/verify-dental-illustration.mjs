/* Focused checks using the real, licensed reference geometry. No patient data. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import ts from "typescript";
import { Box3, Group, Vector3 } from "three";
import { readGlb, meshesOf } from "./verify-dental-assets.mjs";
const cache = new Map();
function moduleUrl(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  let code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  code = code.replace(/from ["']([^"']+)["']/g, (_, specifier) => {
    const url = specifier.startsWith(".")
      ? moduleUrl(path.resolve(path.dirname(file), specifier + ".ts"))
      : import.meta.resolve(specifier);
    return `from ${JSON.stringify(url)}`;
  });
  const url = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  cache.set(file, url);
  return url;
}
const base = "apps/web/features/dental/";
const { dentalIllustration, illustrationChanges, IMPACTION_PRESETS } = await import(
  moduleUrl(base + "illustration.ts")
);
const { applyImpaction } = await import(moduleUrl(base + "tooth-transform.ts"));
const { updateIllustrationOverlays, clearIllustrationOverlays } = await import(
  moduleUrl(base + "illustration-overlays.ts")
);
const finding = (condition, tooth = "48", status = "active") => ({
  key: crypto.randomUUID(),
  tooth,
  condition,
  status,
  surfaces: [],
  notes: "",
  severity: "unknown",
});
for (const status of ["resolved", "historical"]) {
  const state = dentalIllustration(
    [
      finding("Missing tooth", "48", status),
      finding("Crown present", "48", status),
      finding("Orthodontic bracket present", "48", status),
      finding(IMPACTION_PRESETS[0].condition, "48", status),
    ],
    "48",
  );
  assert.equal(state.missing || state.crown || state.bracket || !!state.impaction, false);
}
assert.equal(
  dentalIllustration([finding("Proposed crown"), finding("Possible missing tooth")], "48").missing,
  false,
);
assert.equal(dentalIllustration([finding("Proposed crown")], "48").crown, false);
assert.equal(
  dentalIllustration([finding(IMPACTION_PRESETS[0].condition, "47")], "47").impaction,
  null,
);
const originalFinding = { ...finding("Missing tooth"), encounter_id: "read-only-chart-metadata" };
const changes = illustrationChanges(
  [originalFinding, finding("Pain on palpation")],
  "48",
  "presence",
);
assert.equal(changes.length, 1);
assert.equal(changes[0].key, originalFinding.key);
assert.equal(changes[0].status, "resolved");
assert.equal("encounter_id" in changes[0], false);
assert.equal(originalFinding.status, "active");
console.log(
  "PASS: explicit current states only; copy-forward retains finding identity without changing source evidence",
);
const teeth = meshesOf(readGlb("apps/web/public/models/dental-permanent-dundee-v1.glb"));
for (const tooth of teeth) tooth.geometry.computeBoundingBox();
for (const id of ["18", "28", "38", "48"]) {
  const tooth = teeth.find((item) => item.userData.tooth_id === id);
  const original = tooth.matrix.clone();
  const originalCenter = new Box3().setFromObject(tooth, true).getCenter(new Vector3());
  const pivot = tooth.worldToLocal(originalCenter.clone());
  for (const preset of IMPACTION_PRESETS) {
    applyImpaction(tooth, original, id, preset.value);
    const center = tooth.localToWorld(pivot.clone());
    assert.ok(center.distanceTo(originalCenter) < 1e-5, `center ${id} ${preset.value}`);
    const first = tooth.matrix.clone();
    applyImpaction(tooth, original, id, preset.value);
    assert.ok(
      first.elements.every((value, index) => Math.abs(value - tooth.matrix.elements[index]) < 1e-5),
      "rotation must not accumulate",
    );
    assert.ok(tooth.matrix.elements.every(Number.isFinite));
    assert.notDeepEqual(first.elements, original.elements);
    const point = tooth.geometry.boundingBox.getCenter(new Vector3()).add(new Vector3(0, 0.01, 0));
    const anchored = tooth.worldToLocal(tooth.localToWorld(point.clone()));
    assert.ok(anchored.distanceTo(point) < 1e-5, "pins retain tooth-local coordinates");
  }
  applyImpaction(tooth, original, id, null);
  assert.ok(
    original.elements.every(
      (value, index) => Math.abs(value - tooth.matrix.elements[index]) < 1e-5,
    ),
    "reset restores original",
  );
}
console.log(
  "PASS: all 12 third-molar presets rotate real geometry around its center; no cumulative drift; reset and local pins preserved",
);
const overlays = new Group();
updateIllustrationOverlays(
  overlays,
  teeth,
  [finding("Crown present"), finding("Orthodontic bracket present")],
  "48",
  false,
);
assert.equal(overlays.children.length, 3);
assert.equal(overlays.children[0].material.color.getHexString(), "e1a51b");
for (const child of overlays.children)
  assert.ok(new Box3().setFromObject(child).getSize(new Vector3()).length() > 0);
updateIllustrationOverlays(overlays, teeth, [finding("Crown present")], "48", true);
assert.equal(overlays.children.length, 0);
clearIllustrationOverlays(overlays);
console.log("PASS: crown and bracket geometry exists and reference-only mode omits overlays");
