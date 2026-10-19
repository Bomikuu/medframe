"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/auth/client";
import { stationRequest, type Lease, type Selection } from "./client";

export function useEditingLease(organizationId: string, encounterId: string, enabled: boolean) {
  const [lease, setLease] = useState<Lease | null>(null);
  const [error, setError] = useState("");
  const [initialSelection, setInitialSelection] = useState<Selection>({});
  const selection = useRef<Selection>({});
  const initialized = useRef(false);
  const updateSelection = useCallback((next: Selection) => {
    selection.current = { ...selection.current, ...next };
  }, []);
  const refresh = useCallback(
    async (action = "status", snapshot?: { version: number; generation: number }) => {
      const result = await stationRequest<Lease>("encounter", {
        action,
        organization_id: organizationId,
        encounter_id: encounterId,
        expected_version: snapshot?.version,
        generation: snapshot?.generation,
      });
      setLease(result);
      setError("");
      if (!initialized.current) {
        initialized.current = true;
        selection.current = { ...selection.current, ...result.selection };
        setInitialSelection(result.selection);
      }
      return result;
    },
    [organizationId, encounterId],
  );
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const init = async () => {
      try {
        await stationRequest("context");
        if (!active) return;
        const result = await refresh();
        if (active && result.generation === 0) await refresh("claim");
      } catch (cause) {
        if (active) setError(errorMessage(cause));
      }
    };
    void init();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible")
        void refresh().catch((cause) => {
          if (active) setError(errorMessage(cause));
        });
    }, 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [enabled, refresh]);
  return {
    lease,
    error,
    setError,
    refresh,
    selection,
    initialSelection,
    updateSelection,
    canEdit: !enabled || (!!lease?.can_edit && !error),
  };
}

export type EditingControl = ReturnType<typeof useEditingLease>;
