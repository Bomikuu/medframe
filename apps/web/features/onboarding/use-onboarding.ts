"use client";
import { useCallback, useRef, useState } from "react";
import { onboardingClient } from "./client";
import { snapshotSchema, type Snapshot, type Step, type Fields } from "./schema";
import {
  OnboardingSessionDocument,
  SaveOnboardingStepDocument,
  CompleteClinicSetupDocument,
} from "@/lib/graphql/onboarding/generated";
export function useOnboarding() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const current = useRef<Snapshot | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const completionKey = useRef<string | null>(null);
  const accept = useCallback((value: unknown) => {
    const parsed = snapshotSchema.parse(value);
    if (
      current.current &&
      parsed.id === current.current.id &&
      parsed.version < current.current.version
    )
      return current.current;
    current.current = parsed;
    setSnapshot(parsed);
    return parsed;
  }, []);
  const reload = useCallback(
    async () =>
      accept((await onboardingClient().request(OnboardingSessionDocument, {})).onboardingSession),
    [accept],
  );
  const saveStep = useCallback(
    (step: Step, data: Fields, complete = false) => {
      const work = async () => {
        if (!current.current) throw new Error("Verify your email to resume setup.");
        const result = await onboardingClient().request(SaveOnboardingStepDocument, {
          step,
          data,
          version: current.current.version,
          complete,
        });
        return accept(result.saveOnboardingStep);
      };
      const next = queue.current.then(work, work);
      queue.current = next.catch(() => {});
      return next;
    },
    [accept],
  );
  const complete = useCallback(async () => {
    await queue.current;
    if (!current.current) throw new Error("Resume your clinic setup first.");
    completionKey.current ??= crypto.randomUUID();
    return (
      await onboardingClient().request(CompleteClinicSetupDocument, {
        version: current.current.version,
        key: completionKey.current,
      })
    ).completeClinicOnboarding as { organization_id: string };
  }, []);
  return { snapshot, current, accept, reload, saveStep, complete };
}
