"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function RecoveryCodes({ codes, onContinue }: { codes: string[]; onContinue: () => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/50 p-4 font-mono text-xs sm:text-sm">
        {codes.map((code) => (
          <span key={code} className="select-all">
            {code}
          </span>
        ))}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        Save these in your password manager. Each code works once if you lose your authenticator.
        They will not be shown again.
      </p>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
        <Checkbox
          checked={saved}
          onCheckedChange={(value) => setSaved(value === true)}
          className="mt-1"
        />
        I saved my recovery codes in a safe place.
      </label>
      <Button disabled={!saved} onClick={onContinue}>
        Open workspace
      </Button>
    </div>
  );
}
