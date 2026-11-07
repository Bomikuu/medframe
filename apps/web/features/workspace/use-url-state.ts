"use client";

import { useSearchParams } from "next/navigation";

/** Non-sensitive navigation state only. Patient search and clinical drafts stay in memory. */
export function useUrlState<T extends string>(key: string, fallback: T, choices: readonly T[]) {
  const params = useSearchParams();
  const candidate = params.get(key) as T | null;
  const value = candidate && choices.includes(candidate) ? candidate : fallback;
  function setValue(next: string) {
    if (!choices.includes(next as T)) return;
    const url = new URL(window.location.href);
    if (next === fallback) url.searchParams.delete(key);
    else url.searchParams.set(key, next);
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
  }
  return [value, setValue] as const;
}
