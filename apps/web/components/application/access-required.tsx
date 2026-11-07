"use client";

import { ShieldAlert } from "lucide-react";
import { RecoveryState } from "./recovery-state";

export function AccessRequired({
  description,
  title = "Access required",
  compact = false,
}: {
  description: string;
  title?: string;
  compact?: boolean;
}) {
  return (
    <RecoveryState
      compact={compact}
      title={title}
      description={`${description} Contact your clinic administrator if you need this access.`}
      icon={ShieldAlert}
    />
  );
}
