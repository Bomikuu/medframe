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
  const { organizationId } = useWorkspace();
  const remote = useRemote(OperationsSetupDocument, {
    organizationId,
    branchId: branchId || null,
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
) {
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
    const refresh = () => {
      if (coalesced) return;
      coalesced = setTimeout(() => {
        coalesced = undefined;
        if (!stopped) callback.current();
      }, 200);
    };
    const open = () => {
      if (stopped) return;
      const fallback = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.hostname}:8000/ws/operations`;
      const url = new URL(process.env.NEXT_PUBLIC_OPERATIONS_WS_URL || fallback);
      Object.entries(selected).forEach(([name, value]) => {
        if (value) url.searchParams.set(name, value);
      });
      socket = new WebSocket(url);
      socket.onopen = () => {
        setConnected(true);
        backoff = 1000;
        refresh();
      };
      socket.onmessage = refresh;
      socket.onclose = (event) => {
        setConnected(false);
        refresh();
        if (stopped || event.code === 4403) return;
        reconnect = setTimeout(open, backoff);
        backoff = Math.min(backoff * 2, 30000);
      };
    };
    open();
    const polling = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      stopped = true;
      socket?.close();
      clearTimeout(reconnect);
      clearTimeout(coalesced);
      clearInterval(polling);
      window.removeEventListener("focus", refresh);
    };
  }, [key]);
  return connected;
}
