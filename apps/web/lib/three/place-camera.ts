import { PerspectiveCamera, Vector3 } from "three";
import type { OrbitControls } from "three-stdlib";

// Update camera and orbit target together. Flush old pan/rotation damping before
// focusing so residual manual motion cannot displace the newly centered target.
export function placeCamera(
  camera: PerspectiveCamera,
  controls: OrbitControls | null | undefined,
  center: Vector3,
  direction: Vector3,
  distance: number,
  up = new Vector3(0, 1, 0),
) {
  const damping = controls?.enableDamping;
  if (controls) {
    controls.enableDamping = false;
    controls.update();
    controls.target.copy(center);
  }
  camera.up.copy(up);
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  if (controls) {
    controls.update();
    controls.enableDamping = damping ?? false;
  }
}
