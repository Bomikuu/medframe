/** Offline data conversion only: never executes source atlas scripts or add-ons. */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
const root = process.cwd();
const source = process.argv[2];
if (!source)
  throw new Error("Pass the private source directory containing the two approved FBX files.");
globalThis.window = { URL, innerWidth: 1000, innerHeight: 1000 };
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = `data:${blob.type};base64,${Buffer.from(value).toString("base64")}`;
      this.onloadend?.();
    });
  }
};
THREE.TextureLoader.prototype.load = function () {
  return new THREE.Texture();
};
const bonePattern =
  /^(Tibia|Fibula|Femur|Patella|Hip_bone|Humerus|Ulna|Radius|Clavicle|Scapula|Sacrum|Coccyx|Mandible|Maxilla|Frontal_bone|Parietal_bone|Occipital_bone|Temporal_bone|Sphenoid_bone|Ethmoid_bone|Zygomatic_bone|Nasal_bone|Hyoid_bone|[A-Za-z]+_rib|.*_metacarpal_bone|.*_metatarsal_bone|Talus|Calcaneus|Navicular_bone|Cuboid_bone|.*_cuneiform_bone|(?:Proximal|Middle|Distal)_phalanx.*)([lr])?$|^(Vertebra_[CTL][0-9]+|Atlas_\(C1\)|Axis_\(C2\)|Manubrium_of_sternum|Body_of_sternum|Xiphoid_process)$/;
const sources = JSON.parse(await fs.readFile(path.join(source, "sources.json"), "utf8"));
const manifest = {
  version: 1,
  orientation: { patient_left: "+X", superior: "+Y", anterior: "+Z", unit: "metre" },
  assets: [],
  structures: [],
};
for (const [layer, filename] of [
  ["body", "Regions of human body100.fbx"],
  ["skeleton", "SkeletalSystem100.fbx"],
]) {
  const data = await fs.readFile(path.join(source, filename));
  const scene = new FBXLoader().parse(
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    "",
  );
  scene.updateMatrixWorld(true);
  const all = [];
  scene.traverse((object) => {
    if (object.isMesh) all.push(object);
  });
  const names = new Set(all.map((mesh) => mesh.name));
  const group = new THREE.Group();
  let triangles = 0;
  for (const original of all) {
    const count =
      (original.geometry.index?.count ?? original.geometry.attributes.position.count) / 3;
    const include =
      layer === "skeleton"
        ? bonePattern.test(original.name) && count > 100
        : /[lr]$/.test(original.name) && !/hair|eyelash/i.test(original.name) && count > 20;
    if (!include) continue;
    const transform = new THREE.Matrix4()
      .makeScale(0.01, 0.01, 0.01)
      .multiply(original.matrixWorld);
    let geometry = original.geometry.clone().applyMatrix4(transform);
    for (const attribute of Object.keys(geometry.attributes))
      if (!["position", "normal"].includes(attribute)) geometry.deleteAttribute(attribute);
    geometry.clearGroups();
    geometry = mergeVertices(geometry, 0.000001);
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();
    const paired =
      /[lr]$/.test(original.name) &&
      names.has(original.name.slice(0, -1) + (original.name.endsWith("l") ? "r" : "l"));
    const side = paired ? (original.name.endsWith("l") ? "left" : "right") : "midline";
    const id = `${layer}.${original.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    const label = (paired ? original.name.slice(0, -1) : original.name).replaceAll("_", " ");
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: layer === "body" ? 0xc9d8dc : 0xf0e8d4,
        roughness: 0.8,
      }),
    );
    mesh.name = id;
    mesh.userData = { structure_id: id };
    group.add(mesh);
    triangles += count;
    manifest.structures.push({
      id,
      label,
      layer,
      side,
      sides: [side],
      views: ["front", "back", "left", "right"],
      mesh_id: id,
      asset_version: `anatomy-${layer}-v1`,
      source_mesh: original.name,
      source_to_export: transform.toArray(),
      bounds: { min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray() },
    });
  }
  const binary = Buffer.from(
    await new GLTFExporter().parseAsync(group, { binary: true, onlyVisible: true }),
  );
  if (triangles > 500000 || binary.length > 25 * 1024 * 1024)
    throw new Error(
      `${layer} exceeds the approved asset budget: ${triangles} triangles / ${binary.length} bytes`,
    );
  const output = `apps/web/public/models/anatomy-${layer}-v1.glb`;
  await fs.writeFile(path.join(root, output), binary);
  manifest.assets.push({
    id: `anatomy-${layer}-v1`,
    layer,
    url: `/models/anatomy-${layer}-v1.glb`,
    file: output,
    sha256: crypto.createHash("sha256").update(binary).digest("hex"),
    bytes: binary.length,
    triangles,
    meshes: group.children.length,
    source: sources.find((item) => item.source_filename === filename),
    license: "CC-BY-SA-4.0",
    author: "Z-Anatomy / BodyParts3D contributors",
  });
  console.log(
    `${layer}: ${group.children.length} named meshes, ${triangles} triangles, ${binary.length} GLB bytes`,
  );
}
await fs.writeFile("assets/anatomy/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
await fs.writeFile(
  "assets/anatomy/mapping.json",
  JSON.stringify(
    manifest.structures.map(({ id, source_mesh, side, layer }) => ({
      id,
      source_mesh,
      side,
      layer,
    })),
    null,
    2,
  ) + "\n",
);
await fs.writeFile(
  "apps/web/features/anatomy/reference.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
