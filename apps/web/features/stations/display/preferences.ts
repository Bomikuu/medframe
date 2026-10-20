"use client";

import { useSyncExternalStore } from "react";

const event = "medframe-display-preferences";
function subscribe(update: () => void) {
  window.addEventListener("storage", update);
  window.addEventListener(event, update);
  return () => {
    window.removeEventListener("storage", update);
    window.removeEventListener(event, update);
  };
}
function snapshot() {
  try {
    return `${localStorage.getItem("medframe.display.sound") ?? "off"}|${localStorage.getItem("medframe.display.spoken") ?? "off"}`;
  } catch {
    return "off|off";
  }
}
export function useDisplayPreferences() {
  const value = useSyncExternalStore(subscribe, snapshot, () => "off|off");
  return { sound: value.startsWith("on|"), spoken: value.endsWith("|on") };
}
export function saveDisplayPreference(key: "sound" | "spoken", enabled: boolean) {
  try {
    localStorage.setItem(`medframe.display.${key}`, enabled ? "on" : "off");
    window.dispatchEvent(new Event(event));
  } catch {
    // The current sound gesture still works when local persistence is unavailable.
  }
}
