"use client";

import { useRef, useState } from "react";
import { getGraphqlClient } from "@/lib/graphql/client";
import { ServiceActionDocument, PatientServiceActionDocument } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { financialFailure } from "@/features/billing/use-billing";

export function useServiceAction(kind: "catalog" | "case") {
  const { organizationId } = useWorkspace();
  const capture = useRequestScope();
  const pending = useRef(false);
  const receipt = useRef({ payload: "", id: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(action: string, data: Record<string, unknown>) {
    if (pending.current) return null;
    const current = capture();
    const payload = JSON.stringify({ organizationId, kind, action, data });
    if (receipt.current.payload !== payload) receipt.current = { payload, id: crypto.randomUUID() };
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const variables = { organizationId, action, data, requestId: receipt.current.id };
      const result =
        kind === "catalog"
          ? (await getGraphqlClient().request(ServiceActionDocument, variables)).serviceAction
          : (await getGraphqlClient().request(PatientServiceActionDocument, variables))
              .patientServiceAction;
      if (!current()) return null;
      receipt.current = { payload: "", id: "" };
      return result;
    } catch (failure) {
      if (current()) setError(financialFailure(failure));
      return null;
    } finally {
      pending.current = false;
      if (current()) setBusy(false);
    }
  }
  return { busy, error, run };
}
