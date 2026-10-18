"use client";

import { useEffect } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useSafety } from "@/features/workspace/safety-provider";

/** Memory-only drafts survive route Activity teardown until the user saves or confirms discard. */
export function usePatientDraft<T extends FieldValues>(key: string, form: UseFormReturn<T>) {
  const { getDraft, putDraft } = useSafety();
  const { reset, subscribe } = form;
  useEffect(() => {
    const draft = getDraft<T>(key);
    if (draft) reset(draft, { keepDefaultValues: true });
    return subscribe({
      formState: { values: true, isDirty: true },
      callback: ({ values, isDirty }) => putDraft(key, isDirty ? values : undefined),
    });
  }, [key, getDraft, putDraft, reset, subscribe]);
}
