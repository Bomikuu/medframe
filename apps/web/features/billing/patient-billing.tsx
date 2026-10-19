"use client";

import { useBillingSetup } from "./use-billing";
import { InvoiceCollection } from "./billing-page";
import { LoadState } from "@/features/patients/feedback";

export function PatientBilling({ patientId, branchId }: { patientId: string; branchId: string }) {
  const remote = useBillingSetup(branchId);
  if (!remote.setup) return <LoadState error={remote.error} retry={remote.reload} />;
  return <InvoiceCollection setup={remote.setup} patientId={patientId} />;
}
