"use client";

import { useRef, useState } from "react";
import { ClientError } from "graphql-request";
import {
  BillingActionDocument,
  BillingSetupDocument,
  CommunicationActionDocument,
} from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { failureText } from "@/features/patients/feedback";
import { setupSchema } from "./schema";
import { ApiError } from "@/lib/auth/client";

export function financialFailure(error: unknown) {
  if (error instanceof ClientError) {
    const issue = error.response.errors?.[0];
    if (
      ["INVALID_INPUT", "CONFLICT", "CONSENT_REQUIRED"].includes(String(issue?.extensions?.code))
    ) {
      return issue?.message ?? failureText(error);
    }
  }
  return failureText(error);
}
export function useBillingSetup(branch?: string, search = "") {
  const { organizationId, branchId } = useWorkspace();
  const remote = useRemote(BillingSetupDocument, {
    organizationId,
    branchId: branch || branchId || null,
    search,
  });
  const parsed = setupSchema.safeParse(remote.data?.billingSetup);
  return {
    ...remote,
    setup: parsed.success ? parsed.data : null,
    error:
      remote.error ??
      (remote.data && !parsed.success
        ? new ApiError("Billing settings could not be read.", "INVALID_RESPONSE", 502)
        : null),
  };
}
/** Keep the same receipt for an exact retry; changing fields creates a new request. */
export function useFinancialAction(kind: "billing" | "communication" = "billing") {
  const { organizationId } = useWorkspace();
  const receipt = useRef({ payload: "", id: "" });
  const pending = useRef(false);
  const capture = useRequestScope();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function run(action: string, data: Record<string, unknown>): Promise<unknown | null> {
    if (pending.current) return null;
    pending.current = true;
    const current = capture();
    const payload = JSON.stringify({ organizationId, action, data, kind });
    if (receipt.current.payload !== payload) receipt.current = { payload, id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const variables = { organizationId, action, data, requestId: receipt.current.id };
      const result =
        kind === "billing"
          ? (await getGraphqlClient().request(BillingActionDocument, variables)).billingAction
          : (await getGraphqlClient().request(CommunicationActionDocument, variables))
              .communicationAction;
      if (!current()) return null;
      receipt.current = { payload: "", id: "" };
      setMessage("Changes saved.");
      return result;
    } catch (failure) {
      if (current()) setError(financialFailure(failure));
      return null;
    } finally {
      pending.current = false;
      if (current()) setBusy(false);
    }
  }
  return { run, busy, error, message };
}
