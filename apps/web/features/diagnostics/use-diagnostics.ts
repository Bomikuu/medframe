"use client";
import { useRef, useState } from "react";
import { DiagnosticActionDocument } from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { financialFailure } from "@/features/billing/use-billing";

export function useDiagnosticAction() {
  const { organizationId } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const receipt = useRef({ payload: "", key: "" });
  const pending = useRef(false);
  const capture = useRequestScope();
  async function run(action: string, data: Record<string, unknown>) {
    if (pending.current) return null;
    pending.current = true;
    setBusy(true);
    setError("");
    const current = capture();
    const payload = JSON.stringify({ organizationId, action, data });
    if (receipt.current.payload !== payload)
      receipt.current = { payload, key: crypto.randomUUID() };
    try {
      const result = await getGraphqlClient().request(DiagnosticActionDocument, {
        organizationId,
        action,
        data,
        requestId: receipt.current.key,
      });
      return current() ? result.diagnosticAction : null;
    } catch (error) {
      if (current()) setError(financialFailure(error));
      return null;
    } finally {
      pending.current = false;
      if (current()) setBusy(false);
    }
  }
  return { run, busy, error };
}
