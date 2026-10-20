"use client";

import { useEffect, useState } from "react";
import type { Snapshot } from "./schema";

/** Resolve only this verified invitation's scanned logo, without a public storage URL. */
export function useSavedLogo(logo: Snapshot["logo"]) {
  const [saved, setSaved] = useState<{ id: string; url: string } | null>(null);
  const id = logo?.state === "clean" ? logo.id : null;
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    let url: string | undefined;
    void fetch(`/api/backend/onboarding/logo/${id}/content`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Logo preview unavailable");
        return response.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setSaved({ id, url });
      })
      .catch(() => {});
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  return saved?.id === id ? saved.url : null;
}
