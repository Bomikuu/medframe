import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
} from "three";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export function readGlb(file) {
  const bytes = fs.readFileSync(file);
  const length = bytes.readUInt32LE(12);
  return {
    document: JSON.parse(bytes.subarray(20, 20 + length)),
    binary: bytes.subarray(28 + length),
  };
}
function viewBytes(asset, index) {
  const view = asset.document.bufferViews[index];
  return asset.binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
}
export function meshesOf(asset) {
  const meshes = [];
  function visit(identifier, parent = new Matrix4()) {
    const node = asset.document.nodes[identifier];
    const local = node.matrix
      ? new Matrix4().fromArray(node.matrix)
      : new Matrix4().compose(
          new Vector3(...(node.translation ?? [0, 0, 0])),
          new Quaternion(...(node.rotation ?? [0, 0, 0, 1])),
          new Vector3(...(node.scale ?? [1, 1, 1])),
        );
    const world = parent.clone().multiply(local);
    if (node.mesh !== undefined) {
      const primitive = asset.document.meshes[node.mesh].primitives[0];
      const accessor = asset.document.accessors[primitive.attributes.POSITION];
      const view = asset.document.bufferViews[accessor.bufferView];
      const positions = new Float32Array(accessor.count * 3);
      const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
      for (let index = 0; index < accessor.count; index++)
        for (let axis = 0; axis < 3; axis++)
          positions[index * 3 + axis] = asset.binary.readFloatLE(
            offset + index * (view.byteStride ?? 12) + axis * 4,
          );
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(positions, 3));
      const indices = asset.document.accessors[primitive.indices];
      const indexView = asset.document.bufferViews[indices.bufferView];
      const indexOffset = (indexView.byteOffset ?? 0) + (indices.byteOffset ?? 0);
      const indexBytes = indices.componentType === 5125 ? 4 : 2;
      geometry.setIndex(
        Array.from({ length: indices.count }, (_, index) =>
          indexBytes === 4
            ? asset.binary.readUInt32LE(indexOffset + index * 4)
            : asset.binary.readUInt16LE(indexOffset + index * 2),
        ),
      );
      const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
      mesh.applyMatrix4(world);
      mesh.updateMatrixWorld(true);
      mesh.userData = node.extras;
      meshes.push(mesh);
    }
    for (const child of node.children ?? []) visit(child, world);
  }
  for (const node of asset.document.scenes[asset.document.scene ?? 0].nodes) visit(node);
  return meshes;
}

// Deterministic screen point for a real raycast/browser selection assertion.
export function toothScreenPoint(meshes, tooth, width, height) {
  const box = new Box3();
  for (const mesh of meshes) box.union(new Box3().setFromObject(mesh));
  const center = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  const camera = new PerspectiveCamera(35, width / height, 0.001, 100);
  const tangent = Math.tan((camera.fov * Math.PI) / 360);
  const distance =
    (Math.max(size.y / (2 * tangent), size.x / ((2 * tangent * width) / height)) + size.z / 2) *
    1.12;
  camera.position.copy(center).add(new Vector3(0, 0, distance));
  camera.lookAt(center);
  camera.updateMatrixWorld(true);
  const target = meshes.find((mesh) => mesh.userData.tooth_id === tooth);
  const positions = target.geometry.getAttribute("position");
  const raycaster = new Raycaster();
  for (let index = 0; index < positions.count; index += 7) {
    const point = new Vector3()
      .fromBufferAttribute(positions, index)
      .applyMatrix4(target.matrixWorld)
      .project(camera);
    raycaster.setFromCamera(new Vector2(point.x, point.y), camera);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (hit?.object.userData.tooth_id === tooth)
      return { x: ((point.x + 1) * width) / 2, y: ((1 - point.y) * height) / 2 };
  }
  throw new Error(`No visible front-view raycast point for tooth ${tooth}`);
}

function verify() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets/dental/manifest.json")));
  for (const metadata of manifest.assets) {
    const prepared = readGlb(path.join(root, metadata.output));
    const original = readGlb(
      path.join(
        process.env.DENTAL_SOURCE_DIR ?? "/home/micxsz/Downloads",
        metadata.selectable_teeth === 32 ? "permanent_dentition.glb" : "maxillary_first_molar.glb",
      ),
    );
    const imageViews = new Set(original.document.images.map((image) => image.bufferView));
    original.document.bufferViews.forEach((_, index) => {
      if (!imageViews.has(index))
        assert.deepEqual(
          viewBytes(prepared, index),
          viewBytes(original, index),
          `Geometry buffer ${index} changed`,
        );
    });
    const meshes = meshesOf(prepared);
    assert.equal(meshes.length, metadata.selectable_teeth);
    assert.equal(
      new Set(meshes.map((mesh) => mesh.userData.tooth_id)).size,
      metadata.selectable_teeth,
    );
    for (const mesh of meshes) {
      const id = mesh.userData.tooth_id;
      assert.match(id, /^[1-4][1-8]$/);
      assert.equal(mesh.userData.surface_segmentation, false);
      const center = new Box3().setFromObject(mesh).getCenter(new Vector3());
      if (meshes.length === 32)
        assert.equal(center.x > 0, ["2", "3"].includes(id[0]), `Patient side mismatch for ${id}`);
      assert.equal(mesh.userData.jaw, ["1", "2"].includes(id[0]) ? "upper" : "lower");
    }
    assert.equal(prepared.document.asset.extras.license.includes("CC-BY-4.0"), true);
    console.log(
      `${metadata.title}: ${meshes.length} explicit tooth identities; source geometry preserved; attribution retained.`,
    );
    if (meshes.length === 32)
      console.log("Visible tooth 26 screen point:", toothScreenPoint(meshes, "26", 720, 480));
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) verify();
