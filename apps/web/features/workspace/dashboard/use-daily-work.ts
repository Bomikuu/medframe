"use client";

import { useEffect, useState } from "react";
import { discardRejectedData } from "@/lib/auth/request-failure";
import { requestWithCsrf } from "@/lib/auth/client";
import { useWorkspace } from "../workspace-provider";
import { dailySchema, type DailyData, type VisitFilter } from "./schema";

export function useDailyWork(filter: VisitFilter, page: number, taskPage = 1) {
  const { organizationId, branchId } = useWorkspace();
  const [generation, setGeneration] = useState(0);
  const scope = JSON.stringify({ organizationId, branchId });
  const [state, setState] = useState<{
    scope: string;
    key: string;
    data: DailyData | null;
    error: unknown;
  }>({
    scope: "",
    key: "",
    data: null,
    error: null,
  });
  const key = JSON.stringify({ organizationId, branchId, filter, page, taskPage, generation });
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20000);
    requestWithCsrf(
      "workspace/today",
      { organization_id: organizationId, branch_id: branchId, filter, page, task_page: taskPage },
      { signal: controller.signal },
    )
      .then((value) => {
        const data = dailySchema.parse(value);
        if (!controller.signal.aborted) {
          setState({ scope, key, data, error: null });
        }
      })
      .catch((error) => {
        if (active)
          setState((previous) => ({
            scope,
            key,
            data: previous.scope === scope && !discardRejectedData(error) ? previous.data : null,
            error: controller.signal.aborted
              ? new Error("The daily workspace took too long to load. Refresh to try again.")
              : error,
          }));
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, scope, organizationId, branchId, filter, page, taskPage]);
  return {
    data: state.scope === scope ? state.data : null,
    updating: state.scope === scope && !!state.data && state.key !== key,
    error: state.key === key ? state.error : null,
    loading: state.key !== key,
    reload: () => setGeneration((value) => value + 1),
  };
}
