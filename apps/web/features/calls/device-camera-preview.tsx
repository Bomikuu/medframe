"use client";

import { useEffect, useRef } from "react";
import { VideoOff } from "lucide-react";
import type { CallMedia } from "./use-call-media";

// Mirror the existing local stream without requesting capture or stopping tracks.
export function DeviceCameraPreview({ media }: { media: CallMedia }) {
  const preview = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = preview.current;
    if (!video) return;
    const sync = () => {
      const source = media.local.current?.querySelector("video");
      video.srcObject = source?.srcObject ?? null;
    };
    sync();
    const observer = new MutationObserver(sync);
    if (media.local.current)
      observer.observe(media.local.current, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      video.srcObject = null;
    };
  }, [media.local, media.hasLocalVideo, media.camera]);
  return (
    <div
      className="relative aspect-video overflow-hidden rounded-lg bg-slate-950 text-white"
      aria-label="Local camera check"
    >
      <video
        ref={preview}
        autoPlay
        muted
        playsInline
        className="h-full w-full -scale-x-100 object-contain"
      />
      {(!media.camera || !media.hasLocalVideo) && (
        <div className="absolute inset-0 grid place-content-center gap-2 text-center text-xs text-slate-300">
          <VideoOff aria-hidden className="mx-auto size-5" />
          <span>{media.camera ? "Use Check devices to start a local preview" : "Camera off"}</span>
        </div>
      )}
    </div>
  );
}
