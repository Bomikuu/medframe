"use client";

import { useEffect, useRef, useState } from "react";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { getGraphqlClient } from "@/lib/graphql/client";
import { OperationsActionDocument, OperationsSetupDocument } from "@/lib/graphql/generated";
import { failureCode, failureText } from "@/features/patients/feedback";
import { setupSchema } from "./schema";

export function useOperationsSetup(branchId?: string, search = "") {
  const { organizationId, branchId: currentBranch } = useWorkspace();
  const remote = useRemote(OperationsSetupDocument, {
    organizationId,
    branchId: branchId || currentBranch || null,
    search,
  });
  const parsed = setupSchema.safeParse(remote.data?.operationsSetup);
  return { ...remote, setup: parsed.success ? parsed.data : null };
}

export function useOperationsAction() {
  const { organizationId } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pending = useRef(false);
  const receipt = useRef({ payload: "", id: "" });
  const capture = useRequestScope();
  const run = async (action: string, data: Record<string, unknown>, done: () => void) => {
    if (pending.current) return false;
    pending.current = true;
    const current = capture();
    const payload = JSON.stringify({ organizationId, action, data });
    if (receipt.current.payload !== payload) receipt.current = { payload, id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await getGraphqlClient().request(OperationsActionDocument, {
        organizationId,
        action,
        data,
        requestId: receipt.current.id,
      });
      if (current()) {
        setMessage("Changes saved.");
        receipt.current = { payload: "", id: "" };
        done();
      }
      return current();
    } catch (failure) {
      if (current())
        setError(
          failureCode(failure) === "PAYMENT_REQUIRED"
            ? "Cashier confirmation is required before service. Open Patient Stations to link the service invoice or transfer the same visit to cashier."
            : failureText(failure),
        );
      return false;
    } finally {
      pending.current = false;
      if (current()) setBusy(false);
    }
  };
  return { run, busy, message, error };
}

export function useOperationsLive(
  scope: { organization?: string; branch?: string; link?: string },
  reload: () => void,
  options: { pollWhileConnected?: boolean } = {},
) {
  const pollWhileConnected = options.pollWhileConnected ?? true;
  const [connected, setConnected] = useState(false);
  const callback = useRef(reload);
  useEffect(() => {
    callback.current = reload;
  }, [reload]);
  const key = JSON.stringify(scope);
  useEffect(() => {
    const selected = JSON.parse(key) as Record<string, string>;
    if (!selected.link && (!selected.branch || !selected.organization)) return;
    let stopped = false;
    let socket: WebSocket | undefined;
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    let coalesced: ReturnType<typeof setTimeout> | undefined;
    let backoff = 1000;
    let revision: number | undefined;
    let opened = false;
    let denied = false;
    let lastReconnectRefresh = 0;
    const refresh = () => {
      if (stopped || denied || coalesced || document.visibilityState !== "visible") return;
      coalesced = setTimeout(() => {
        coalesced = undefined;
        if (!stopped && !denied) callback.current();
      }, 750);
    };
    const open = () => {
      if (stopped || denied) return;
      const configured = process.env.NEXT_PUBLIC_OPERATIONS_WS_URL;
      const callOrigin = process.env.NEXT_PUBLIC_CALL_WS_ORIGIN;
      // The launcher supplies the selected API port; never guess another local service.
      if (!configured && !callOrigin && location.protocol !== "https:") return;
      const url = new URL(configured || `${callOrigin || `wss://${location.host}`}/ws/operations`);
      Object.entries(selected).forEach(([name, value]) => {
        if (value) url.searchParams.set(name, value);
      });
      const current = new WebSocket(url);
      socket = current;
      current.onopen = () => {
        if (stopped || socket !== current) return;
        setConnected(true);
        backoff = 1000;
        // The initial query already loads the page. Only reconnects need catch-up.
        if (opened && Date.now() - lastReconnectRefresh >= 30000) {
          lastReconnectRefresh = Date.now();
          refresh();
        }
        opened = true;
      };
      current.onmessage = (event) => {
        if (stopped || socket !== current) return;
        try {
          const message: unknown = JSON.parse(event.data);
          if (!message || typeof message !== "object") return;
          const update = message as { kind?: string; revision?: number };
          // The server's connection greeting is not a data change.
          if (
            update.kind !== "changed" ||
            typeof update.revision !== "number" ||
            !Number.isSafeInteger(update.revision)
          )
            return;
          if (revision !== undefined && update.revision <= revision) return;
          revision = update.revision;
          refresh();
        } catch {
          // Unknown frames do not invalidate the calendar.
        }
      };
      current.onclose = (event) => {
        if (stopped || socket !== current) return;
        setConnected(false);
        denied = event.code === 4403;
        if (denied) {
          clearTimeout(coalesced);
          coalesced = undefined;
          // Reauthorize once; do not turn a rejected socket into a refresh loop.
          callback.current();
          return;
        }
        reconnect = setTimeout(open, backoff);
        backoff = Math.min(backoff * 2, 30000);
      };
    };
    open();
    const polling = setInterval(() => {
      // Queues retain time-based estimate refreshes; calendars poll only when offline.
      if (!denied && (pollWhileConnected || socket?.readyState !== WebSocket.OPEN)) refresh();
    }, 30000);
    return () => {
      stopped = true;
      socket?.close();
      clearTimeout(reconnect);
      clearTimeout(coalesced);
      clearInterval(polling);
    };
  }, [key, pollWhileConnected]);
  return connected;
}
