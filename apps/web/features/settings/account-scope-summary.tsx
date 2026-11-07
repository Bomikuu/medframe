"use client";

import { UserRound, Building2 } from "lucide-react";
import { useWorkspace } from "@/features/workspace/workspace-provider";

export function AccountScopeSummary() {
  const { workspace, can } = useWorkspace();
  return (
    <details className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <summary className="w-fit cursor-pointer rounded-sm text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">
        What these settings change
      </summary>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <UserRound aria-hidden className="size-4 text-teal-ink" />
            Your account
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your display name and profile image identify you across your clinic memberships.
            Remembered-browser controls affect your own browser verification; signing out does not
            delete clinic records.
          </p>
        </section>
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Building2 aria-hidden className="size-4 text-teal-ink" />
            {workspace.organization.name}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {can("organization.manage")
              ? "Clinic sign-in policy applies to this clinic’s team. Changing it requires the existing password confirmation and can end reduced-verification sessions."
              : "A clinic administrator manages this clinic’s team and sign-in policy. Your personal profile changes do not alter your clinic role."}
          </p>
        </section>
      </div>
      <dl className="mt-5 grid gap-4 border-t border-border pt-4 text-xs sm:grid-cols-3">
        {[
          [
            "Clinical records",
            can("patients.clinical.read")
              ? "Permitted records only"
              : "No clinical read permission",
          ],
          [
            "Billing",
            can("billing.read")
              ? can("payments.record")
                ? "View and record permitted payments"
                : "View permitted bills"
              : "No billing permission",
          ],
          [
            "Clinic administration",
            can("organization.manage")
              ? "Clinic settings and team management"
              : "Managed by your administrator",
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        This summary does not grant access. Patient grants, branch restrictions, Station
        restrictions and current server authorization still apply. The strongest applicable clinic
        sign-in policy governs your account.
      </p>
    </details>
  );
}
