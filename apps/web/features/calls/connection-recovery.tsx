"use client";

import { useEffect, useState } from "react";
import {
  Headphones,
  LoaderCircle,
  WifiOff,
  SignalLow,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CallMedia } from "./use-call-media";

export function ConnectionRecovery({
  media,
  canConnect,
}: {
  media: CallMedia;
  canConnect: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!media.reconnectingAt && !media.restoredAt) return;
    const timer = window.setInterval(() => {
      const value = Date.now();
      setNow(value);
      if (!media.reconnectingAt && media.restoredAt && value - media.restoredAt >= 8000)
        window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [media.reconnectingAt, media.restoredAt]);
  const poor = ["poor", "lost"].includes(media.quality);
  const remotePoor = ["poor", "lost"].includes(media.remoteQuality);
  const reconnecting = media.phase === "reconnecting";
  const disconnected = media.phase === "disconnected";
  const restored = !poor && !remotePoor && !!media.restoredAt && now - media.restoredAt < 8000;
  if (!media.offline && !poor && !remotePoor && !reconnecting && !disconnected && !restored)
    return null;
  const Icon = media.offline
    ? WifiOff
    : reconnecting
      ? LoaderCircle
      : restored
        ? CheckCircle2
        : SignalLow;
  const title = media.offline
    ? "Your browser is offline"
    : reconnecting
      ? "Restoring your call"
      : disconnected
        ? "Your call disconnected"
        : poor
          ? "Your connection is struggling"
          : remotePoor
            ? "The other participant has a weak connection"
            : "Call connection restored";
  return (
    <section
      aria-label="Connection recovery"
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-prose min-w-0">
          <h2 role="status" className="flex items-center gap-2 text-sm font-semibold">
            <Icon
              aria-hidden
              className={`size-4 shrink-0 ${reconnecting ? "animate-spin motion-reduce:animate-none" : ""}`}
            />
            {title}
          </h2>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            {media.offline
              ? "Check Wi-Fi or mobile data. Messages need a connection to send; keep your unsent draft here."
              : reconnecting
                ? "The call is reconnecting automatically. Your chat draft stays in this room. You can turn off your camera to reduce outgoing video."
                : disconnected
                  ? "Your camera and audio connection has stopped. Rejoin while the appointment remains open; your conversation draft stays here."
                  : remotePoor && !poor
                    ? "Their audio or video may pause. The other participant may need to improve their network connection."
                    : restored
                      ? "Audio and video have reconnected. Check that you can hear the other participant."
                      : "Audio or video may pause. Try audio only to stop sending your camera; this does not guarantee a better connection."}
          </p>
          {reconnecting && media.reconnectingAt && (
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              Reconnecting for {Math.max(0, Math.floor((now - media.reconnectingAt) / 1000))}{" "}
              seconds
            </p>
          )}
        </div>
        {!media.offline && canConnect && disconnected && (
          <Button
            type="button"
            variant="outline"
            disabled={media.busy}
            onClick={() => void media.connect()}
          >
            <RefreshCw aria-hidden className="size-4" />
            {media.busy ? "Rejoining…" : "Rejoin call"}
          </Button>
        )}
        {!canConnect && (disconnected || reconnecting) && (
          <p className="text-xs leading-5 text-muted-foreground">
            Room entry is not currently allowed. Refresh appointment status or ask the clinic
            whether the room has ended; reconnecting cannot extend room access.
          </p>
        )}
        {!media.offline && canConnect && !restored && (
          <Button
            variant="outline"
            disabled={media.busy || (!disconnected && !media.camera)}
            onClick={() => void media.audioOnly()}
          >
            <Headphones aria-hidden className="size-4" />
            {disconnected
              ? "Rejoin audio only"
              : media.camera
                ? "Switch to audio only"
                : "Camera is already off"}
          </Button>
        )}
      </div>
    </section>
  );
}
