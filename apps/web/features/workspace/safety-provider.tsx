"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AlertDialog } from "radix-ui";
import { useHistoryGuard } from "./use-history-guard";
import { Button } from "@/components/ui/button";

type Confirmation = { title: string; description: string; action: string };
type Safety = {
  confirm: (options: Confirmation) => Promise<boolean>;
  guard: (action: () => void, force?: boolean) => Promise<void>;
  setDirty: (key: string, value: boolean, discard: () => void) => void;
  clearDirty: () => void;
  getDraft: <T>(key: string) => T | undefined;
  putDraft: (key: string, value: unknown | undefined) => void;
};
const SafetyContext = createContext<Safety | null>(null);

export function SafetyProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const drafts = useRef(new Map<string, unknown>());
  const dirty = useRef(new Map<string, () => void>());
  const restoreFocus = useRef<HTMLElement | null>(null);
  const pending = useRef<((accepted: boolean) => void) | null>(null);
  const [dialog, setDialog] = useState<Confirmation | null>(null);
  const confirm = useCallback(
    (options: Confirmation) =>
      new Promise<boolean>((resolve) => {
        if (pending.current) pending.current(false);
        restoreFocus.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        pending.current = resolve;
        setDialog(options);
      }),
    [],
  );
  const finish = useCallback((accepted: boolean) => {
    pending.current?.(accepted);
    pending.current = null;
    setDialog(null);
    requestAnimationFrame(() => restoreFocus.current?.focus());
  }, []);
  const guard = useCallback(
    async (action: () => void, force = false) => {
      if (
        (!force && !dirty.current.size) ||
        (await confirm({
          title: "Discard unsaved changes?",
          description: "Your changes have not been saved. Leaving this page will discard them.",
          action: "Discard changes",
        }))
      ) {
        for (const discard of dirty.current.values()) discard();
        dirty.current.clear();
        drafts.current.clear();
        action();
      }
    },
    [confirm],
  );
  const hasUnsaved = useCallback(() => dirty.current.size > 0, []);
  const navigate = useCallback((url: string) => router.push(url), [router]);
  useHistoryGuard(hasUnsaved, guard, navigate);
  const setDirty = useCallback((key: string, value: boolean, discard: () => void) => {
    if (value) dirty.current.set(key, discard);
    else dirty.current.delete(key);
  }, []);
  const clearDirty = useCallback(() => {
    dirty.current.clear();
    drafts.current.clear();
  }, []);
  const getDraft = useCallback(<T,>(key: string) => drafts.current.get(key) as T | undefined, []);
  const putDraft = useCallback((key: string, value: unknown | undefined) => {
    if (value === undefined) drafts.current.delete(key);
    else drafts.current.set(key, structuredClone(value));
  }, []);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty.current.size) event.preventDefault();
    };
    const intercept = (event: MouseEvent) => {
      if (
        !dirty.current.size ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element).closest("a");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href);
      if (
        url.origin !== window.location.origin ||
        (url.pathname === window.location.pathname && url.search === window.location.search)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      void guard(() => router.push(url.pathname + url.search));
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", intercept, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", intercept, true);
    };
  }, [guard, router]);
  return (
    <SafetyContext.Provider value={{ confirm, guard, setDirty, clearDirty, getDraft, putDraft }}>
      {children}
      <AlertDialog.Root
        open={!!dialog}
        onOpenChange={(open) => {
          if (!open) finish(false);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-foreground/30" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 grid max-h-[85dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
            <AlertDialog.Title className="text-xl font-semibold">{dialog?.title}</AlertDialog.Title>
            <AlertDialog.Description className="text-sm leading-6 text-muted-foreground">
              {dialog?.description}
            </AlertDialog.Description>
            <div className="flex flex-wrap justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <Button variant="outline" onClick={() => finish(false)}>
                  Keep editing
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button onClick={() => finish(true)}>{dialog?.action}</Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </SafetyContext.Provider>
  );
}

export function useSafety() {
  const value = useContext(SafetyContext);
  if (!value) throw new Error("SafetyProvider is required");
  return value;
}

export function useUnsavedChanges(key: string, isDirty: boolean, discard: () => void) {
  const { setDirty } = useSafety();
  useEffect(() => {
    setDirty(key, isDirty, discard);
    // Activity teardown can precede history confirmation. A stable form scope
    // lets a restored form replace its registration and clear it after save.
  }, [key, isDirty, discard, setDirty]);
}
