"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  LogOut,
  AlertCircle,
  Clock3,
} from "lucide-react";
import { OnboardingNotice } from "./onboarding-notice";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ClinicStep } from "./clinic-step";
import { SpecialtyStep } from "./specialty-step";
import { BrandingStep } from "./branding-step";
import { PracticeStep } from "./practice-step";
import { message } from "./client";
import { stepValidation, type Fields, type References, type Snapshot, type Step } from "./schema";
export function StepForm({
  step,
  headerTarget,
  navigation,
  snapshot,
  references,
  save,
  accept,
  version,
  onContinue,
  onBack,
  onExit,
}: {
  step: Step;
  headerTarget?: HTMLElement | null;
  navigation?: RefObject<((next: Step) => Promise<void>) | null>;
  snapshot: Snapshot;
  references: References;
  save: (step: Step, data: Fields, complete?: boolean) => Promise<Snapshot>;
  accept: (value: unknown) => unknown;
  version: () => number;
  onContinue: (next: Step) => void;
  onBack: () => void;
  onExit: () => void;
}) {
  const initial = snapshot.data[step];
  const defaults =
    step === "practice"
      ? {
          ...initial,
          daily_hours: Object.fromEntries(
            Array.from({ length: 7 }, (_, day) => [
              String(day),
              (initial.daily_hours as Record<string, unknown> | undefined)?.[String(day)] ?? {
                opens: initial.opens || "09:00",
                closes: initial.closes || "17:00",
              },
            ]),
          ),
        }
      : initial;
  const form = useForm<Fields>({
    defaultValues: defaults,
    resolver: zodResolver(stepValidation(step)),
    mode: "onTouched",
  });
  const values = useWatch({ control: form.control });
  const [status, setStatus] = useState("All changes saved"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const saved = useRef(JSON.stringify(defaults)),
    pending = useRef<ReturnType<typeof setTimeout> | null>(null),
    active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function persist(complete = false) {
    if (pending.current) clearTimeout(pending.current);
    const data = form.getValues(),
      encoded = JSON.stringify(data);
    if (!complete && encoded === saved.current) return snapshot;
    if (complete) {
      form.clearErrors();
      const checked = stepValidation(step).safeParse(data);
      if (!checked.success) {
        for (const issue of checked.error.issues)
          form.setError(issue.path.join("."), { message: issue.message });
        form.setFocus(checked.error.issues[0].path.join("."));
        setError("Review the highlighted fields before continuing. Your entries have been kept.");
        throw new Error("Validation required");
      }
    }
    setStatus("Saving…");
    try {
      const result = await save(step, data, complete);
      saved.current = encoded;
      if (active.current) {
        setStatus(
          JSON.stringify(form.getValues()) === encoded ? "All changes saved" : "Unsaved changes",
        );
        setError("");
      }
      return result;
    } catch (e) {
      if (active.current) {
        setStatus("Unable to save changes");
        setError(message(e));
      }
      throw e;
    }
  }
  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  });
  useEffect(() => {
    if (JSON.stringify(values) === saved.current) return;
    setStatus("Unsaved changes");
    pending.current = setTimeout(() => {
      void persistRef.current().catch(() => {});
    }, 900);
    return () => {
      if (pending.current) clearTimeout(pending.current);
    };
  }, [values]);
  useEffect(() => {
    if (!navigation) return;
    navigation.current = async (next) => {
      setBusy(true);
      try {
        await persistRef.current(false);
        onContinue(next);
      } catch {
        /* The save owner keeps the visible error and current step. */
      } finally {
        if (active.current) setBusy(false);
      }
    };
    return () => {
      navigation.current = null;
    };
  }, [navigation, onContinue]);
  async function act(action: "continue" | "exit" | "back") {
    setBusy(true);
    try {
      const result = await persist(action === "continue");
      if (action === "continue")
        onContinue(
          result.account_ready && result.status === "ready_for_review"
            ? "review"
            : result.current_step,
        );
      else if (action === "exit") onExit();
      else onBack();
    } catch {
    } finally {
      if (active.current) setBusy(false);
    }
  }
  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void act("continue");
        }}
        className="space-y-7"
      >
        {headerTarget &&
          createPortal(
            <>
              <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
                {status === "Saving…" ? (
                  <LoaderCircle
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : status === "Unable to save changes" ? (
                  <AlertCircle className="size-4 text-destructive" aria-hidden="true" />
                ) : status === "Unsaved changes" ? (
                  <Clock3 className="size-4" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="size-4 text-teal-700" aria-hidden="true" />
                )}
                {status}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void act("exit")}
              >
                <LogOut aria-hidden="true" />
                Save and exit
              </Button>
            </>,
            headerTarget,
          )}
        {error && <OnboardingNotice tone="error">{error}</OnboardingNotice>}
        {step === "clinic" && <ClinicStep references={references} />}
        {step === "specialties" && <SpecialtyStep references={references} />}
        {step === "branding" && (
          <BrandingStep
            snapshot={snapshot}
            references={references}
            version={version}
            accept={accept}
            flush={() => persist(false)}
          />
        )}
        {step === "practice" && <PracticeStep />}

        <footer className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 border-t bg-white/95 px-1 pt-5 pb-[max(12px,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            disabled={busy || step === "clinic"}
            onClick={() => void act("back")}
          >
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>
          <Button disabled={busy} type="submit">
            {busy ? (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <ArrowRight aria-hidden="true" />
            )}
            {busy ? "Saving…" : "Continue"}
          </Button>
        </footer>
      </form>
    </FormProvider>
  );
}
