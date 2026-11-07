"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import type { Variables } from "graphql-request";
import { discardRejectedData } from "@/lib/auth/request-failure";
import { getGraphqlClient } from "@/lib/graphql/client";

export function useRemote<T, V extends Variables>(
  document: TypedDocumentNode<T, V>,
  variables: V,
  options: { enabled?: boolean; client?: typeof getGraphqlClient; refreshOnFocus?: boolean } = {},
) {
  const enabled = options.enabled ?? true;
  const client = options.client ?? getGraphqlClient;
  const refreshOnFocus = options.refreshOnFocus ?? true;
  const serialized = JSON.stringify(variables);
  const pending = useRef(false);
  const queued = useRef(false);
  const [generation, setGeneration] = useState(0);
  const [state, setState] = useState<{
    key: string;
    generation: number;
    data: T | null;
    error: unknown;
  }>({ key: "", generation: -1, data: null, error: null });
  const reload = useCallback(() => {
    if (pending.current) queued.current = true;
    else setGeneration((value) => value + 1);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    pending.current = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20000);
    client()
      .request<T>({ document, variables: JSON.parse(serialized) as V, signal: controller.signal })
      .then((data) => {
        if (active) setState({ key: serialized, generation, data, error: null });
      })
      .catch((error: unknown) => {
        if (active)
          setState((previous) => ({
            key: serialized,
            generation,
            data: previous.key === serialized && !discardRejectedData(error) ? previous.data : null,
            error,
          }));
      })
      .finally(() => {
        window.clearTimeout(timer);
        if (!active) return;
        pending.current = false;
        if (queued.current) {
          queued.current = false;
          setGeneration((value) => value + 1);
        }
      });
    return () => {
      active = false;
      pending.current = false;
      queued.current = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [document, serialized, generation, enabled, client]);
  useEffect(() => {
    if (!refreshOnFocus) return;
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload, refreshOnFocus]);
  const current = state.key === serialized;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: !current || state.generation !== generation,
    reload,
  };
}
