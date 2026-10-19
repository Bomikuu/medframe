import { Box3, Matrix4, Vector3, type Mesh } from "three";
import type { Impaction } from "./illustration";
import { toothDirection } from "./camera-focus";

// Restore from an immutable per-view matrix before every update: toggling or
// rerendering never accumulates rotation, and the shared GLTF stays untouched.
export function applyImpaction(
  mesh: Mesh,
  original: Matrix4,
  tooth: string,
  impaction: Impaction | null,
) {
  original.decompose(mesh.position, mesh.quaternion, mesh.scale);
  mesh.updateMatrixWorld(true);
  if (!impaction) return;
  const center = new Box3().setFromObject(mesh, true).getCenter(new Vector3());
  const upper = Number(tooth[0]) <= 2;
  const crown = new Vector3(0, upper ? -1 : 1, 0);
  const mesial = toothDirection(tooth, "mesial");
  const axis = new Vector3().crossVectors(crown, mesial).normalize();
  const angle =
    (impaction === "horizontal" ? Math.PI / 2 : Math.PI / 4) * (impaction === "distal" ? -1 : 1);
  const world = new Matrix4()
    .makeTranslation(center.x, center.y, center.z)
    .multiply(new Matrix4().makeRotationAxis(axis, angle))
    .multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z))
    .multiply(mesh.matrixWorld);
  const local = mesh.parent ? mesh.parent.matrixWorld.clone().invert().multiply(world) : world;
  local.decompose(mesh.position, mesh.quaternion, mesh.scale);
  mesh.updateMatrixWorld(true);
}
