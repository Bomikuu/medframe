"use client";

import { useEffect } from "react";
import { callSocket } from "./client";

/** Socket frames invalidate snapshots; snapshots still own authorization and content. */
export function useRoomUpdates(roomId: string, authorized: boolean, refresh: () => Promise<void>) {
  useEffect(() => {
    if (!authorized) return;
    let stopped = false;
    let denied = false;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let coalesced: ReturnType<typeof setTimeout> | undefined;
    let lastRefresh = Date.now();
    const requestRefresh = () => {
      if (stopped || denied || coalesced || document.visibilityState !== "visible") return;
      coalesced = setTimeout(() => {
        coalesced = undefined;
        if (stopped || denied) return;
        lastRefresh = Date.now();
        void refresh();
      }, 250);
    };
    const open = () => {
      if (stopped || denied) return;
      try {
        const current = new WebSocket(callSocket(roomId));
        socket = current;
        current.onmessage = (event) => {
          if (stopped || socket !== current) return;
          try {
            const value: unknown = JSON.parse(event.data);
            if (value && typeof value === "object" && "kind" in value && value.kind === "refresh")
              requestRefresh();
          } catch {
            // Unknown frames never replace the last authorized snapshot.
          }
        };
        current.onclose = (event) => {
          if (stopped || socket !== current) return;
          if (event.code === 4403) {
            denied = true;
            clearTimeout(coalesced);
            coalesced = undefined;
            // Reauthorize immediately; a rejected socket must not reconnect forever.
            void refresh();
          } else {
            requestRefresh();
            retry = setTimeout(open, 5000);
          }
        };
      } catch {
        retry = setTimeout(open, 5000);
      }
    };
    open();
    const interval = setInterval(() => {
      // A quiet live socket needs a safety snapshot, not five-second page refreshes.
      if (!denied && (socket?.readyState !== WebSocket.OPEN || Date.now() - lastRefresh >= 30000))
        requestRefresh();
    }, 5000);
    window.addEventListener("focus", requestRefresh);
    document.addEventListener("visibilitychange", requestRefresh);
    return () => {
      stopped = true;
      socket?.close();
      clearTimeout(retry);
      clearTimeout(coalesced);
      clearInterval(interval);
      window.removeEventListener("focus", requestRefresh);
      document.removeEventListener("visibilitychange", requestRefresh);
    };
  }, [authorized, roomId, refresh]);
}
