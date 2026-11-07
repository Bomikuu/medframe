"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { LoadingInformation } from "@/components/application/loading-information";
import { AccessRequired } from "@/components/application/access-required";
import { Button } from "@/components/ui/button";
import { ApiError, errorMessage, requestWithCsrf } from "@/lib/auth/client";
import { BrowserMemory } from "@/features/auth/browser-memory";
import { SecuritySettings, type SecuritySnapshot } from "./security-settings";

export function SecurityPage() {
  const { organizationId, can } = useWorkspace();
  const allowed = can("organization.manage");
  const [generation, setGeneration] = useState(0);
  const [state, setState] = useState<{
    organization: string;
    data: SecuritySnapshot | null;
    error: string;
    denied: boolean;
  }>({ organization: "", data: null, error: "", denied: false });
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    let live = true;
    requestWithCsrf<SecuritySnapshot>(
      "organizations/security",
      { organization_id: organizationId },
      { signal: controller.signal },
    )
      .then((data) => {
        if (live) setState({ organization: organizationId, data, error: "", denied: false });
      })
      .catch((cause) => {
        if (live)
          setState({
            organization: organizationId,
            data: null,
            error: errorMessage(cause),
            denied: cause instanceof ApiError && [401, 403].includes(cause.status),
          });
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [organizationId, allowed, generation]);
  const current = state.organization === organizationId ? state : null;
  if (!allowed || current?.denied)
    return (
      <AccessRequired
        title="Clinic security access required"
        description={current?.error || "A clinic administrator manages staff sign-in requirements."}
      />
    );
  if (current?.error)
    return (
      <div role="alert" className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 text-sm">{current.error}</p>
        <Button onClick={() => setGeneration((value) => value + 1)}>Try again</Button>
      </div>
    );
  if (!current?.data)
    return (
      <div className="grid min-h-96 place-items-center">
        <LoadingInformation
          title="Loading clinic security"
          detail="Checking the current staff sign-in requirement."
        />
      </div>
    );
  return (
    <div className="grid gap-6">
      <SecuritySettings
        key={organizationId}
        data={current.data}
        reload={() => {
          setState({ organization: organizationId, data: null, error: "", denied: false });
          setGeneration((value) => value + 1);
        }}
        save={async (mode, password, revision) => {
          const data = await requestWithCsrf<SecuritySnapshot>("organizations/security", {
            organization_id: organizationId,
            action: "update",
            mode,
            password,
            revision,
          });
          // Keep this owner mounted after save so acknowledgement and reauthentication guidance remain visible.
          setState({ organization: organizationId, data, error: "", denied: false });
          return data;
        }}
      />
      <BrowserMemory />
    </div>
  );
}
