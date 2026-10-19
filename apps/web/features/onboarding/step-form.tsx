"use client";
import { useEffect, useRef, useState } from "react";
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
  snapshot: Snapshot;
  references: References;
  save: (step: Step, data: Fields, complete?: boolean) => Promise<Snapshot>;
  accept: (value: unknown) => unknown;
  version: () => number;
  onContinue: (next: Step) => void;
  onBack: () => void;
  onExit: () => void;
}) {
  const form = useForm<Fields>({ defaultValues: snapshot.data[step] });
  const values = useWatch({ control: form.control });
  const [status, setStatus] = useState("All changes saved"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const saved = useRef(JSON.stringify(snapshot.data[step])),
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
      const checked = stepValidation(step).safeParse(data);
      if (!checked.success) {
        const issue = checked.error.issues[0];
        form.setError(String(issue.path[0]), { message: issue.message }, { shouldFocus: true });
        setError(issue.message);
        throw new Error(issue.message);
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <p role="status" className="text-xs text-muted-foreground">
            {status}
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void act("exit")}
          >
            Save and exit
          </Button>
        </div>
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
        {error && (
          <p
            role="alert"
            tabIndex={-1}
            className="rounded-lg bg-destructive/5 p-4 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <footer className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 border-t bg-white/95 px-1 pt-5 pb-[max(12px,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            disabled={busy || step === "clinic"}
            onClick={() => void act("back")}
          >
            Back
          </Button>
          <Button disabled={busy} type="submit">
            {busy ? "Saving…" : "Continue"}
          </Button>
        </footer>
      </form>
    </FormProvider>
  );
}
