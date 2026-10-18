"use client";

import { useCallback, useEffect, useState } from "react";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import type { Variables } from "graphql-request";
import { failureCode } from "./feedback";
import { getGraphqlClient } from "@/lib/graphql/client";

export function useRemote<T, V extends Variables>(
  document: TypedDocumentNode<T, V>,
  variables: V,
  options: { enabled?: boolean; client?: typeof getGraphqlClient } = {},
) {
  const enabled = options.enabled ?? true;
  const client = options.client ?? getGraphqlClient;
  const serialized = JSON.stringify(variables);
  const [generation, setGeneration] = useState(0);
  const [state, setState] = useState<{
    key: string;
    generation: number;
    data: T | null;
    error: unknown;
  }>({ key: "", generation: -1, data: null, error: null });
  const reload = useCallback(() => setGeneration((value) => value + 1), []);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
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
            data:
              previous.key === serialized &&
              !["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED"].includes(failureCode(error))
                ? previous.data
                : null,
            error,
          }));
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [document, serialized, generation, enabled, client]);
  useEffect(() => {
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);
  const current = state.key === serialized;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: !current || state.generation !== generation,
    reload,
  };
}
