"use client";

import { useRef, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "./workspace-provider";
import { ClinicSwitcherDialog } from "./clinic-switcher-dialog";

/** The same header dialog for workspaces with a compact Station shell. */
export function HeaderBranchControl() {
  const { workspace, branchId } = useWorkspace();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const branch = workspace.branches.find((item) => item.id === branchId);
  return (
    <>
      <Button
        ref={trigger}
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="max-w-64"
      >
        <MapPin aria-hidden className="size-4 shrink-0" />
        <span className="truncate">{branch?.name ?? "Clinic & branches"}</span>
        <ChevronDown aria-hidden className="size-3.5 shrink-0" />
      </Button>
      <ClinicSwitcherDialog open={open} onOpenChange={setOpen} returnFocus={trigger} />
    </>
  );
}
