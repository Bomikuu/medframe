"use client";

import { createContext, useContext } from "react";
import type { Selection } from "./client";

export const EditorSelectionContext = createContext<{
  initial: Selection;
  update: (next: Selection) => void;
} | null>(null);

export const useEditorSelection = () => useContext(EditorSelectionContext);
