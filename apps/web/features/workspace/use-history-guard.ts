"use client";

import { useEffect } from "react";

const indexKey = "__medframeHistoryIndex";

/** Keep a same-document history traversal from unmounting a draft before its confirmation. */
export function useHistoryGuard(
  hasUnsaved: () => boolean,
  guard: (action: () => void, force?: boolean) => Promise<void>,
  navigate: (url: string) => void,
) {
  useEffect(() => {
    const pushState = window.history.pushState;
    const replaceState = window.history.replaceState;
    let index = Number(window.history.state?.[indexKey] ?? 0);
    let lastUrl = window.location.href;
    let lastState = { ...window.history.state, [indexKey]: index };
    let restoreDelta: number | null = null;
    let replaying = false;
    let traversalHadDraft = false;
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const beforeTraversal = (event: Event) => {
      if (
        (event as Event & { navigationType?: string }).navigationType === "traverse" &&
        !replaying &&
        restoreDelta === null
      ) {
        traversalHadDraft = hasUnsaved();
      }
    };
    replaceState.call(window.history, lastState, "");
    function push(data: unknown, unused: string, url?: string | URL | null) {
      index += 1;
      pushState.call(window.history, { ...(data as object), [indexKey]: index }, unused, url);
      lastUrl = window.location.href;
      lastState = window.history.state;
    }
    function replace(data: unknown, unused: string, url?: string | URL | null) {
      replaceState.call(window.history, { ...(data as object), [indexKey]: index }, unused, url);
      lastUrl = window.location.href;
      lastState = window.history.state;
    }
    function traverse(event: PopStateEvent) {
      if (restoreDelta !== null) {
        event.stopImmediatePropagation();
        const delta = restoreDelta;
        restoreDelta = null;
        void guard(() => {
          replaying = true;
          window.history.go(delta);
        }, true);
        traversalHadDraft = false;
        return;
      }
      const targetIndex = event.state?.[indexKey];
      if (replaying || (!hasUnsaved() && !traversalHadDraft)) {
        replaying = false;
        traversalHadDraft = false;
        index = typeof targetIndex === "number" ? targetIndex : index;
        lastUrl = window.location.href;
        lastState = window.history.state;
        return;
      }
      event.stopImmediatePropagation();
      const targetUrl = window.location.href;
      if (typeof targetIndex === "number" && targetIndex !== index) {
        restoreDelta = targetIndex - index;
        window.history.go(-restoreDelta);
      } else {
        // An entry predating this clinic layout has no index. Preserve its destination
        // without allowing Next's popstate listener to discard the mounted form first.
        replaceState.call(window.history, lastState, "", lastUrl);
        void guard(() => navigate(targetUrl), true);
        traversalHadDraft = false;
      }
    }
    window.history.pushState = push;
    window.history.replaceState = replace;
    navigation?.addEventListener("navigate", beforeTraversal);
    window.addEventListener("popstate", traverse, true);
    return () => {
      navigation?.removeEventListener("navigate", beforeTraversal);
      window.removeEventListener("popstate", traverse, true);
      if (window.history.pushState === push) window.history.pushState = pushState;
      if (window.history.replaceState === replace) window.history.replaceState = replaceState;
    };
  }, [guard, hasUnsaved, navigate]);
}
