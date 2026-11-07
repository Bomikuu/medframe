import { ShieldCheck } from "lucide-react";
import type { AccessSettings } from "./client";

const billingCodes = ["billing.read", "billing.manage", "payments.record", "billing.adjust"];
const levels: Record<AccessSettings["billing_access"], string[]> = {
  inherit: [],
  none: [],
  view: ["billing.read"],
  record: ["billing.read", "payments.record"],
  manage: ["billing.read", "payments.record", "billing.manage"],
};

/** Presentation of supplied native role metadata; the server authorizes every save/action. */
export function accessPermissions(value: AccessSettings, roles: Record<string, string[]>) {
  const codes = new Set(value.roles.flatMap((role) => roles[role] ?? []));
  if (value.billing_access === "inherit") return [...codes];
  const result = new Set([...codes].filter((code) => !billingCodes.includes(code)));
  for (const code of levels[value.billing_access]) result.add(code);
  if (value.billing_access === "manage" && codes.has("billing.adjust"))
    result.add("billing.adjust");
  return [...result];
}

export function StaffAccessSummary({
  value,
  branch,
  permissions,
  active = true,
}: {
  value: Pick<AccessSettings, "roles" | "workspace_mode" | "specialty">;
  branch: string;
  permissions: string[];
  active?: boolean;
}) {
  const has = (code: string) => permissions.includes(code);
  const billing = [
    has("billing.read") && "View invoices",
    has("billing.manage") && "manage invoices",
    has("payments.record") && "record payments",
    has("billing.adjust") && "adjustments and refunds",
  ]
    .filter(Boolean)
    .join(" · ");
  const clinical = value.roles.some((role) => ["doctor", "dentist"].includes(role));
  return (
    <section
      aria-label="Access summary"
      className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck aria-hidden className="size-4 shrink-0 text-teal-ink" />
        Access summary
      </h3>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Workspace</dt>
          <dd className="mt-1 break-words">
            {!active
              ? "Inactive membership — no clinic access"
              : value.workspace_mode === "station"
                ? "Approved Stations only; regular clinic pages blocked"
                : "Clinic workspace, within assigned permissions"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Branch</dt>
          <dd className="mt-1 break-words">{branch}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Billing permissions</dt>
          <dd className="mt-1 leading-6">{billing || "No billing access"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Clinical tools</dt>
          <dd className="mt-1 leading-6">
            {has("encounters.write")
              ? "Document permitted consultations"
              : has("patients.clinical.read")
                ? "Read permitted clinical records"
                : "No clinical-record access from these permissions"}
          </dd>
        </div>
      </dl>
      <p className="mt-4 border-t border-border pt-3 text-xs leading-6 text-muted-foreground">
        Patient grants, live clinic membership and Station device permissions still apply. These
        settings do not grant access to every patient.
      </p>
      {(!value.roles.length || (clinical && !value.specialty)) && (
        <p role="status" className="mt-3 text-sm text-destructive">
          {!value.roles.length
            ? "Choose at least one clinic role."
            : "Choose a doctor specialization before saving."}
        </p>
      )}
    </section>
  );
}
