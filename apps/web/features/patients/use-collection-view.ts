"use client";
import { useSyncExternalStore } from "react";
const eventName = "medframe-collection-view";
export function useCollectionView(scope: string) {
 const key = `medframe:view:${scope}`;
 const value = useSyncExternalStore(callback => { window.addEventListener("storage", callback); window.addEventListener(eventName, callback); return () => { window.removeEventListener("storage", callback); window.removeEventListener(eventName, callback); }; }, () => { try { return localStorage.getItem(key) === "cards" ? "cards" : "table"; } catch { return "table"; } }, () => "table") as "table" | "cards";
 function setValue(next: "table" | "cards") { try { localStorage.setItem(key, next); } catch { /* Presentation preference is optional. */ } window.dispatchEvent(new Event(eventName)); }
 return [value, setValue] as const;
}
