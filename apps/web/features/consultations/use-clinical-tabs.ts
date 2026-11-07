"use client";

import { useState } from "react";

/** Lazy first mount, retained thereafter so local chart dialogs/pending input are not discarded. */
export function useClinicalTabs(initial: string) {
  const [state, setState] = useState({ active: initial, visited: [initial] });
  const select = (active: string) =>
    setState((previous) => ({
      active,
      visited: previous.visited.includes(active) ? previous.visited : [...previous.visited, active],
    }));
  return {
    active: state.active,
    select,
    visited: (value: string) => state.visited.includes(value),
  };
}
