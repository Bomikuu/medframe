"use client";

import { useSyncExternalStore } from "react";

const eventName = "medframe-collection-view";
type CollectionView = "table" | "cards";

export function useCollectionView(scope: string, defaultView: CollectionView = "table") {
  const key = `medframe:view:${scope}`;
  const value = useSyncExternalStore(
    (callback) => {
      window.addEventListener("storage", callback);
      window.addEventListener(eventName, callback);
      return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(eventName, callback);
      };
    },
    () => {
      try {
        const saved = localStorage.getItem(key);
        return saved === "cards" || saved === "table" ? saved : defaultView;
      } catch {
        return defaultView;
      }
    },
    () => defaultView,
  );
  function setValue(next: CollectionView) {
    try {
      localStorage.setItem(key, next);
    } catch {
      // The presentation preference remains optional.
    }
    window.dispatchEvent(new Event(eventName));
  }
  return [value, setValue] as const;
}
