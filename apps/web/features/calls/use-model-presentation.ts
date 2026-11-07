"use client";

import { useEffect, useRef, useState } from "react";
import type { CameraSource, SharedCameraPose } from "@/lib/three/shared-camera";
import { callSocket, type CallState } from "./client";
import {
  PRESENTATION_ASSETS,
  presentationSchema,
  type ModelPart,
  type PresentationModel,
  type PresentationScene,
  type PresentationState,
} from "./presentation-types";

export function useModelPresentation(room: CallState) {
  const [presentation, setPresentation] = useState<PresentationState | null>(null);
  const [connection, setConnection] = useState<"connecting" | "ready" | "reconnecting" | "closed">(
    "connecting",
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [localViewOnly, setLocalViewOnly] = useState(false);
  const latest = useRef<PresentationState | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const pending = useRef<SharedCameraPose | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ready = useRef(false);
  const listeners = useRef(new Set<() => void>());
  const source = useRef<CameraSource>({
    current: null,
    subscribe(listener) {
      listeners.current.add(listener);
      return () => {
        listeners.current.delete(listener);
      };
    },
  });
  useEffect(() => {
    if (!room.role || room.admitted === false) return;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const connect = () => {
      if (stopped) return;
      const ws = new WebSocket(callSocket(room.id, "presentation"));
      socket.current = ws;
      ws.onmessage = (event) => {
        if (
          stopped ||
          socket.current !== ws ||
          typeof event.data !== "string" ||
          event.data.length > 32768
        )
          return;
        try {
          const value = JSON.parse(event.data);
          if (value.kind === "recoverable_error") {
            setError(
              typeof value.message === "string" ? value.message : "Model sharing is unavailable.",
            );
            if (value.code === "PRESENTATION_UNAVAILABLE") {
              ready.current = false;
              setConnection("reconnecting");
              ws.close();
            }
            return;
          }
          if (!["snapshot", "presentation_updated"].includes(value.kind)) return;
          const next = presentationSchema.parse(value.state);
          if (next.generation !== room.generation) return;
          const previous = latest.current;
          if (previous && next.revision < previous.revision && value.kind !== "snapshot") return;
          if (previous && next.revision === previous.revision && value.kind !== "snapshot") return;
          const recovering = !ready.current && !!previous;
          ready.current = true;
          attempts = 0;
          setConnection("ready");
          setError("");
          source.current.current = next.camera;
          listeners.current.forEach((listener) => listener());
          const changed =
            !previous ||
            next.epoch !== previous.epoch ||
            next.scene_revision !== previous.scene_revision ||
            next.active !== previous.active ||
            next.selection_epoch !== previous.selection_epoch ||
            JSON.stringify(next.patient_pointer) !== JSON.stringify(previous.patient_pointer);
          latest.current = next;
          if (changed || value.kind === "snapshot") setPresentation(next);
          if (next.epoch !== previous?.epoch) {
            setLocalViewOnly(false);
            pending.current = null;
            setNotice(
              next.active
                ? `Your doctor is presenting ${next.model === "dental" ? "a dental model" : next.model === "body" ? "body anatomy" : "the skeleton"}.`
                : "",
            );
          } else if (previous?.active && !next.active)
            setNotice("Model sharing stopped. Your call can continue.");
          else if (previous && next.allow_patient_selection !== previous.allow_patient_selection)
            setNotice(
              next.allow_patient_selection
                ? "Your doctor enabled selection. Choose a tooth or body part to point it out."
                : "Selection is off. You can keep following your doctor’s view.",
            );
          else if (recovering && next.active)
            setNotice("Shared model reconnected. You’re following the latest view.");
        } catch {
          ready.current = false;
          setError(
            "The shared model response is incompatible. Reconnect to request its latest state.",
          );
          setConnection("closed");
          ws.close(4400);
        }
      };
      ws.onclose = (event) => {
        if (stopped || socket.current !== ws) return;
        ready.current = false;
        pending.current = null;
        if (timer.current) clearTimeout(timer.current);
        if (stopped) return;
        if ([4403, 4400].includes(event.code)) {
          setConnection("closed");
          setError(
            "Model sharing access is unavailable. Refresh the room status to check your access.",
          );
          return;
        }
        setConnection("reconnecting");
        retry = setTimeout(connect, Math.min(10000, 1000 * 2 ** Math.min(attempts++, 3)));
      };
    };
    connect();
    return () => {
      stopped = true;
      ready.current = false;
      pending.current = null;
      if (retry) clearTimeout(retry);
      if (timer.current) clearTimeout(timer.current);
      socket.current?.close();
      latest.current = null;
      source.current.current = null;
    };
  }, [room.id, room.generation, room.role, room.admitted]);
  function send(action: string, values: Record<string, unknown> = {}) {
    if (!ready.current || socket.current?.readyState !== WebSocket.OPEN || !latest.current) return;
    socket.current.send(
      JSON.stringify({ protocol_version: 1, action, epoch: latest.current.epoch, ...values }),
    );
  }
  function setCamera(pose: SharedCameraPose) {
    if (room.role !== "doctor" || !ready.current) return;
    pending.current = pose;
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      const current = pending.current;
      pending.current = null;
      if (current && latest.current?.active)
        send("set_camera", { camera: current, scene_revision: latest.current.scene_revision });
    }, 80);
  }
  function setFocus(focus: ModelPart | null, scene?: Partial<PresentationScene>) {
    if (room.role !== "doctor" || !latest.current) return;
    pending.current = null;
    send("set_focus", { focus, ...latest.current.scene, ...scene });
  }
  const canSelect =
    connection === "ready" &&
    !!presentation?.active &&
    !!presentation.model &&
    presentation.asset_version === PRESENTATION_ASSETS[presentation.model] &&
    (room.role === "doctor" || (!!presentation.allow_patient_selection && !localViewOnly));
  return {
    presentation,
    connection,
    error,
    notice,
    localViewOnly,
    setLocalViewOnly,
    canSelect,
    cameraSource: source.current,
    start: (model: PresentationModel) => {
      if (room.role === "doctor") send("start_presentation", { model });
    },
    stop: () => {
      if (room.role === "doctor") send("stop_presentation");
    },
    setCamera,
    setFocus,
    setSelectionPermission: (allowed: boolean) => {
      if (room.role === "doctor") send("set_selection_permission", { allowed });
    },
    point: (part: ModelPart) => {
      if (room.role === "patient" && canSelect)
        send("point_at_part", { part, selection_epoch: latest.current?.selection_epoch });
    },
    clearPointer: () => {
      if (room.role === "patient" && canSelect)
        send("clear_pointer", { selection_epoch: latest.current?.selection_epoch });
    },
  };
}
export type ModelPresentation = ReturnType<typeof useModelPresentation>;
