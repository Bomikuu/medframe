import fs from "node:fs/promises";
import crypto from "node:crypto";
import assert from "node:assert/strict";
const manifest = JSON.parse(await fs.readFile("assets/anatomy/manifest.json", "utf8"));
assert.equal(manifest.orientation.patient_left, "+X");
const seen = new Set();
for (const asset of manifest.assets) {
  const data = await fs.readFile(asset.file);
  assert.equal(crypto.createHash("sha256").update(data).digest("hex"), asset.sha256);
  assert.equal(data.length, asset.bytes);
  assert(data.length <= 25 * 1024 * 1024);
  assert(asset.triangles <= 500000);
  assert.equal(data.readUInt32LE(0), 0x46546c67);
  const length = data.readUInt32LE(12);
  const gltf = JSON.parse(data.subarray(20, 20 + length).toString());
  const meshes = gltf.nodes.filter((node) => node.mesh !== undefined);
  const entries = manifest.structures.filter((value) => value.layer === asset.layer);
  assert.equal(meshes.length, asset.meshes);
  assert.equal(entries.length, meshes.length);
  let triangles = 0;
  for (const mesh of gltf.meshes)
    for (const primitive of mesh.primitives)
      triangles += gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3;
  assert.equal(triangles, asset.triangles);
  for (const item of entries) {
    assert(!seen.has(item.id));
    seen.add(item.id);
    assert(meshes.some((node) => node.extras?.structure_id === item.mesh_id));
    assert(item.source_to_export.length === 16);
    assert(
      item.bounds.min.every(
        (value, index) => Number.isFinite(value) && value <= item.bounds.max[index],
      ),
    );
  }
  console.log(
    `${asset.layer}: ${meshes.length} mapped meshes, ${triangles} triangles, ${data.length} bytes; hash and bounds verified`,
  );
}
for (const name of ["humerus", "femur"]) {
  const left = manifest.structures.find((value) => value.id === `skeleton.${name}l`);
  const right = manifest.structures.find((value) => value.id === `skeleton.${name}r`);
  assert.equal(left.side, "left");
  assert.equal(right.side, "right");
  assert(
    (left.bounds.min[0] + left.bounds.max[0]) / 2 > (right.bounds.min[0] + right.bounds.max[0]) / 2,
  );
}
assert.deepEqual(
  manifest,
  JSON.parse(await fs.readFile("apps/web/features/anatomy/reference.json", "utf8")),
);
console.log(
  "Canonical patient sides and frontend/server registry match. Anatomical correctness is not independently validated.",
);
