"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import type { OrbitControls } from "three-stdlib";

export type SharedCameraPose = {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  fov: number;
  aspect: number;
};
export type CameraSource = {
  current: SharedCameraPose | null;
  subscribe: (listener: () => void) => () => void;
};
export type SharedSceneControl = {
  controlled: boolean;
  preservePose?: boolean;
  source: CameraSource;
  onPose: (pose: SharedCameraPose) => void;
};

// Imperative camera interpolation avoids React renders for continuous remote movement.
export function SharedCameraBridge({ controlled, source, onPose }: SharedSceneControl) {
  const { camera, controls: genericControls, invalidate, size } = useThree();
  const controls = genericControls as OrbitControls | undefined;
  const callback = useRef(onPose);
  callback.current = onPose;
  const desired = useRef<SharedCameraPose | null>(null);
  const initial = useRef(true);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || !controls) return;
    const receive = () => {
      if (!controlled || initial.current) {
        desired.current = source.current;
        initial.current = false;
        invalidate();
      }
    };
    if (!controlled) {
      controls.minDistance = 0.001;
      controls.maxDistance = 2000;
    }
    receive();
    const unsubscribe = source.subscribe(receive);
    const changed = () => {
      if (!controlled || desired.current) return;
      callback.current({
        position: camera.position.toArray() as [number, number, number],
        target: controls.target.toArray() as [number, number, number],
        up: camera.up.toArray() as [number, number, number],
        fov: camera.fov,
        aspect: camera.aspect,
      });
    };
    controls.addEventListener("change", changed);
    // Initial fit is also published when assets finish framing the scene.
    if (controlled && !source.current) changed();
    return () => {
      unsubscribe();
      controls.removeEventListener("change", changed);
    };
  }, [camera, controls, controlled, source, invalidate]);
  useEffect(() => {
    if (!controlled) {
      desired.current = source.current;
      invalidate();
    }
  }, [size.width, size.height, controlled, source, invalidate]);
  useFrame((_, delta) => {
    const pose = desired.current;
    if (!pose || !controls || !(camera instanceof PerspectiveCamera)) return;
    const target = new Vector3(...pose.target);
    const position = new Vector3(...pose.position);
    // Keep the presenter's vertical extent and fit its horizontal extent on narrow devices.
    const factor = Math.max(1, pose.aspect / Math.max(0.1, size.width / size.height));
    position.sub(target).multiplyScalar(factor).add(target);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alpha = reduced ? 1 : 1 - Math.exp(-18 * Math.min(delta, 0.1));
    camera.position.lerp(position, alpha);
    controls.target.lerp(target, alpha);
    camera.up.lerp(new Vector3(...pose.up), alpha).normalize();
    camera.fov += (pose.fov - camera.fov) * alpha;
    camera.near = 0.001;
    camera.far = 2000;
    camera.updateProjectionMatrix();
    controls.update();
    const settled =
      camera.position.distanceToSquared(position) < 1e-7 &&
      controls.target.distanceToSquared(target) < 1e-7 &&
      Math.abs(camera.fov - pose.fov) < 0.01;
    if (settled) {
      camera.position.copy(position);
      controls.target.copy(target);
      camera.up.set(...pose.up).normalize();
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
      controls.update();
      desired.current = null;
    } else invalidate();
  });
  return null;
}
