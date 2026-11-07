"use client";

import { useState, type SetStateAction } from "react";

/** Cursors can encode patient names: keep them in memory and reset when query/scope changes. */
export function useCursorHistory(scope: string) {
  const [state, setState] = useState<{ scope: string; values: (string | null)[] }>({
    scope,
    values: [null],
  });
  const values = state.scope === scope ? state.values : [null];
  function update(next: SetStateAction<(string | null)[]>) {
    setState((previous) => ({
      scope,
      values:
        typeof next === "function"
          ? next(previous.scope === scope ? previous.values : [null])
          : next,
    }));
  }
  return [values, update] as const;
}
