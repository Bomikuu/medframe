"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Room as LiveRoom } from "livekit-client";
import { errorMessage } from "@/lib/auth/client";
import { useDeviceChecks } from "./use-device-checks";
import { callSocket } from "./client";

type Phase = "idle" | "preview" | "connecting" | "connected" | "reconnecting" | "disconnected";
type Quality = "excellent" | "good" | "poor" | "lost" | "unknown";
type DeviceKind = "videoinput" | "audioinput";

export function useCallMedia(roomId: string, enabled: boolean, canConnect: boolean) {
  const checks = useDeviceChecks();
  const local = useRef<HTMLDivElement>(null);
  const remote = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLDivElement>(null);
  const room = useRef<LiveRoom | null>(null);
  const preview = useRef<MediaStream | null>(null);
  const alive = useRef(true);
  const enabledNow = useRef(enabled);
  enabledNow.current = enabled;
  const generation = useRef(0);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [quality, setQuality] = useState<Quality>("unknown");
  const [remoteQuality, setRemoteQuality] = useState<Quality>("unknown");
  const [reconnectingAt, setReconnectingAt] = useState<number | null>(null);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const [camera, setCamera] = useState(true);
  const [microphone, setMicrophone] = useState(true);
  const [speaker, setSpeaker] = useState(true);
  const speakerEnabled = useRef(true);
  const [hasLocalVideo, setHasLocalVideo] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [remotePresent, setRemotePresent] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [microphoneId, setMicrophoneId] = useState("");
  const current = (token: number) =>
    alive.current && enabledNow.current && generation.current === token;
  const stopPreview = useCallback(() => {
    checks.stop();
    preview.current?.getTracks().forEach((track) => track.stop());
    preview.current = null;
  }, [checks.stop]);
  const leave = useCallback(() => {
    generation.current += 1;
    pending.current = false;
    stopPreview();
    const previous = room.current;
    room.current = null;
    void previous?.disconnect(true);
    local.current?.replaceChildren();
    remote.current?.replaceChildren();
    audio.current?.replaceChildren();
    if (alive.current) {
      setPhase("idle");
      setQuality("unknown");
      setRemoteQuality("unknown");
      setReconnectingAt(null);
      setBusy(false);
      setHasLocalVideo(false);
      setHasRemoteVideo(false);
      setRemotePresent(false);
    }
  }, [stopPreview]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      leave();
    };
  }, [leave]);
  useEffect(() => {
    if (!enabled) leave();
  }, [enabled, leave]);

  async function refreshDevices() {
    try {
      if (!navigator.mediaDevices?.enumerateDevices)
        throw new Error("Device selection needs a supported browser on HTTPS or localhost.");
      const list = await navigator.mediaDevices.enumerateDevices();
      if (alive.current && enabledNow.current)
        setDevices(
          list.filter((item) => item.deviceId && ["audioinput", "videoinput"].includes(item.kind)),
        );
    } catch (failure) {
      if (alive.current) setError(errorMessage(failure));
    }
  }
  async function capture(token: number, videoId = cameraId, audioId = microphoneId) {
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error("Camera access needs a supported browser and HTTPS or localhost.");
    if (!camera && !microphone)
      throw new Error("Turn on the camera or microphone preference before checking devices.");
    stopPreview();
    setHasLocalVideo(false);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: camera ? (videoId ? { deviceId: { exact: videoId } } : true) : false,
      audio: microphone ? (audioId ? { deviceId: { exact: audioId } } : true) : false,
    });
    if (!current(token)) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    preview.current = stream;
    const video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.className = "h-full w-full object-cover -scale-x-100";
    local.current?.replaceChildren(video);
    setHasLocalVideo(stream.getVideoTracks().some((track) => track.enabled));
    setPhase("preview");
    await checks.analyze(stream);
    await refreshDevices();
  }
  async function checkDevices() {
    if (!enabledNow.current || pending.current || room.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const token = generation.current;
    try {
      await capture(token);
    } catch (failure) {
      if (current(token))
        setError(`${errorMessage(failure)} You can still use chat or try audio only.`);
    } finally {
      if (current(token)) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  async function connect(audioOnly = false) {
    if (!enabledNow.current || !canConnect || pending.current || room.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setPhase("connecting");
    const token = generation.current;
    stopPreview();
    setHasLocalVideo(false);
    local.current?.replaceChildren();
    let joined: LiveRoom | null = null;
    try {
      const { Room, RoomEvent, Track } = await import("livekit-client");
      if (!current(token)) return;
      const active = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: cameraId ? { deviceId: cameraId } : undefined,
        audioCaptureDefaults: microphoneId ? { deviceId: microphoneId } : undefined,
      });
      joined = active;
      room.current = active;
      const valid = () => current(token) && room.current === active;
      const presence = () => {
        if (!valid()) return;
        setRemotePresent(active.remoteParticipants.size > 0);
        setHasRemoteVideo(
          [...active.remoteParticipants.values()].some((participant) =>
            [...participant.videoTrackPublications.values()].some(
              (publication) => !!publication.track && !publication.isMuted,
            ),
          ),
        );
      };
      active.on(RoomEvent.TrackSubscribed, (track) => {
        if (!valid()) return;
        const element = track.attach();
        element.className = "h-full w-full object-contain";
        if (element instanceof HTMLVideoElement) element.playsInline = true;
        if (track.kind === Track.Kind.Video) remote.current?.replaceChildren(element);
        else {
          element.muted = !speakerEnabled.current;
          audio.current?.append(element);
        }
        presence();
      });
      active.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => element.remove());
        presence();
      });
      active.on(RoomEvent.TrackMuted, presence);
      active.on(RoomEvent.TrackUnmuted, presence);
      active.on(RoomEvent.ParticipantConnected, presence);
      active.on(RoomEvent.ParticipantDisconnected, presence);
      active.on(RoomEvent.LocalTrackPublished, (publication) => {
        if (!valid() || publication.track?.kind !== Track.Kind.Video) return;
        const element = publication.track.attach();
        element.muted = true;
        element.className = "h-full w-full object-cover -scale-x-100";
        local.current?.replaceChildren(element);
        setHasLocalVideo(!publication.isMuted);
      });
      active.on(RoomEvent.LocalTrackUnpublished, (publication) => {
        publication.track?.detach().forEach((element) => element.remove());
        if (valid() && publication.kind === Track.Kind.Video) setHasLocalVideo(false);
      });
      const reconnecting = () => {
        if (!valid()) return;
        setPhase("reconnecting");
        setReconnectingAt((value) => value ?? Date.now());
        setRestoredAt(null);
      };
      active.on(RoomEvent.Reconnecting, reconnecting);
      active.on(RoomEvent.SignalReconnecting, reconnecting);
      active.on(RoomEvent.ConnectionQualityChanged, (next, participant) => {
        if (!valid()) return;
        if (participant === active.localParticipant) setQuality(next as Quality);
        else setRemoteQuality(next as Quality);
      });
      active.on(RoomEvent.Reconnected, () => {
        if (valid()) {
          setPhase("connected");
          setReconnectingAt(null);
          setRestoredAt(Date.now());
          presence();
        }
      });
      active.on(RoomEvent.Disconnected, () => {
        if (!valid()) return;
        room.current = null;
        local.current?.replaceChildren();
        remote.current?.replaceChildren();
        audio.current?.replaceChildren();
        setPhase("disconnected");
        setReconnectingAt(null);
        setQuality("unknown");
        setRemoteQuality("unknown");
        setHasLocalVideo(false);
        setHasRemoteVideo(false);
        setRemotePresent(false);
      });
      // Credentials remain in the native cookie-authorized gateway, not in this client.
      await active.connect(callSocket(roomId, "").replace(/\/$/, ""), "medframe");
      if (!valid()) {
        await active.disconnect(true);
        return;
      }
      setPhase("connected");
      setReconnectingAt(null);
      setRestoredAt(null);
      setQuality(active.localParticipant.connectionQuality as Quality);
      presence();
      try {
        await active.localParticipant.setMicrophoneEnabled(microphone);
        if (!valid()) return;
        await active.localParticipant.setCameraEnabled(audioOnly ? false : camera);
        if (!valid()) return;
        setMicrophone(active.localParticipant.isMicrophoneEnabled);
        setCamera(active.localParticipant.isCameraEnabled);
        setHasLocalVideo(active.localParticipant.isCameraEnabled);
      } catch (failure) {
        if (valid()) {
          setMicrophone(active.localParticipant.isMicrophoneEnabled);
          setCamera(active.localParticipant.isCameraEnabled);
          setHasLocalVideo(active.localParticipant.isCameraEnabled);
          setError(`${errorMessage(failure)} Check browser permissions; chat is still available.`);
        }
      }
      try {
        if (valid() && speakerEnabled.current) await active.startAudio();
      } catch {
        if (valid()) setError("Tap Speaker to enable appointment audio in this browser.");
      }
      await refreshDevices();
    } catch (failure) {
      if (joined) {
        if (room.current === joined) room.current = null;
        await joined.disconnect(true);
      }
      if (current(token)) {
        setPhase("disconnected");
        setReconnectingAt(null);
        setQuality("unknown");
        setRemoteQuality("unknown");
        setHasLocalVideo(false);
        setHasRemoteVideo(false);
        setRemotePresent(false);
        setError(errorMessage(failure));
      }
    } finally {
      if (current(token)) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  async function toggle(kind: "camera" | "microphone" | "speaker") {
    if (!enabledNow.current || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const token = generation.current;
    try {
      const active = room.current;
      if (kind === "camera") {
        if (active) await active.localParticipant.setCameraEnabled(!camera);
        if (!current(token)) return;
        preview.current?.getVideoTracks().forEach((track) => {
          track.enabled = !camera;
        });
        setCamera(!camera);
        setHasLocalVideo(!camera && (!!active || !!preview.current?.getVideoTracks().length));
      } else if (kind === "microphone") {
        if (active) await active.localParticipant.setMicrophoneEnabled(!microphone);
        if (!current(token)) return;
        preview.current?.getAudioTracks().forEach((track) => {
          track.enabled = !microphone;
        });
        setMicrophone(!microphone);
      } else {
        if (active && !speaker) await active.startAudio();
        if (!current(token)) return;
        audio.current?.querySelectorAll("audio").forEach((item) => {
          item.muted = speaker;
        });
        speakerEnabled.current = !speaker;
        setSpeaker(!speaker);
      }
    } catch (failure) {
      if (current(token)) setError(errorMessage(failure));
    } finally {
      if (current(token)) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  async function audioOnly() {
    if (!enabledNow.current || pending.current) return;
    if (!room.current) return connect(true);
    pending.current = true;
    setBusy(true);
    setError("");
    const token = generation.current;
    try {
      await room.current.localParticipant.setCameraEnabled(false);
      if (!current(token)) return;
      setCamera(false);
      setHasLocalVideo(false);
    } catch (failure) {
      if (current(token)) setError(errorMessage(failure));
    } finally {
      if (current(token)) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  async function chooseDevice(kind: DeviceKind, id: string) {
    if (!enabledNow.current || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const token = generation.current;
    try {
      if (room.current) {
        const target = id || devices.find((item) => item.kind === kind)?.deviceId;
        if (!target)
          throw new Error("Refresh devices, then select an available camera or microphone.");
        const changed = await room.current.switchActiveDevice(kind, target);
        if (!changed) throw new Error("That device could not be selected. Choose another device.");
      } else if (preview.current)
        await capture(
          token,
          kind === "videoinput" ? id : cameraId,
          kind === "audioinput" ? id : microphoneId,
        );
      if (!current(token)) return;
      if (kind === "videoinput") setCameraId(id);
      else setMicrophoneId(id);
    } catch (failure) {
      if (current(token)) setError(errorMessage(failure));
    } finally {
      if (current(token)) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  return {
    local,
    remote,
    audio,
    hasLocalVideo,
    hasRemoteVideo,
    remotePresent,
    camera,
    microphone,
    speaker,
    phase,
    busy,
    error,
    devices,
    quality,
    remoteQuality,
    reconnectingAt,
    restoredAt,
    offline,
    audioOnly,
    cameraId,
    microphoneId,
    leave,
    connect,
    checkDevices,
    refreshDevices,
    chooseDevice,
    checks,
    checkMicrophone: async () => {
      if (room.current) {
        const track = [...room.current.localParticipant.audioTrackPublications.values()].find(
          (item) => !!item.track,
        )?.track;
        if (track && microphone) await checks.analyze(new MediaStream([track.mediaStreamTrack]));
        else setError("Unmute your microphone before checking its signal.");
      } else await checkDevices();
    },
    toggleCamera: () => toggle("camera"),
    toggleMicrophone: () => toggle("microphone"),
    toggleSpeaker: () => toggle("speaker"),
  };
}
export type CallMedia = ReturnType<typeof useCallMedia>;
