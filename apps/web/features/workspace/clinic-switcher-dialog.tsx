"use client";

import { useState, type RefObject } from "react";
import { Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSelect } from "@/features/patients/form-controls";
import { useWorkspace } from "./workspace-provider";

export function ClinicSwitcherDialog({
  open,
  onOpenChange,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const { overview, organizationId, workspace, switchOrganization, branchId, switchBranch } =
    useWorkspace();
  const [selectedId, setSelectedId] = useState(organizationId);
  const [branchChoice, setSelectedBranch] = useState<string | null>(null);
  const selectedBranch = branchChoice ?? branchId;
  const selection = overview.myOrganizations.find((organization) => organization.id === selectedId);
  const isCurrent = selectedId === organizationId;

  function close() {
    setSelectedId(organizationId);
    setSelectedBranch(null);
    onOpenChange(false);
  }

  function apply() {
    if (!selection) return;
    close();
    if (!isCurrent) switchOrganization(selection.id);
    else if (selectedBranch !== branchId) switchBranch(selectedBranch);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
        }}
      >
        <DialogHeader className="pr-7">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Building2 aria-hidden className="size-5 text-teal-ink" />
            Clinic & branches
          </DialogTitle>
          <DialogDescription>Choose the clinic workspace you want to use.</DialogDescription>
        </DialogHeader>
        <FormSelect
          id="workspace-clinic"
          label="Clinic"
          value={selectedId}
          onChange={setSelectedId}
          options={overview.myOrganizations.map((organization) => ({
            value: organization.id,
            label: organization.name,
          }))}
        />
        {isCurrent ? (
          <section
            aria-label="Available branches"
            className="rounded-lg border border-border bg-muted/30 p-4"
          >
            <h2 className="text-sm font-semibold">Current branch</h2>
            {workspace.branches.length ? (
              <div className="mt-3 grid gap-2" role="group" aria-label="Choose current branch">
                {workspace.branches.map((branch) => (
                  <Button
                    type="button"
                    key={branch.id}
                    variant={selectedBranch === branch.id ? "secondary" : "ghost"}
                    aria-pressed={selectedBranch === branch.id}
                    className="h-auto justify-start py-3 text-left whitespace-normal"
                    onClick={() => setSelectedBranch(branch.id)}
                  >
                    <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-ink" />
                    <span className="min-w-0 wrap-anywhere">{branch.name}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No branches are available for this membership.
              </p>
            )}
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Clinic pages use this branch. Your existing access permissions still apply.
            </p>
          </section>
        ) : (
          <p role="status" className="rounded-lg bg-teal-soft p-4 text-sm leading-6 text-teal-ink">
            Your permitted branches and tools will load when you switch clinics.
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="button" disabled={!selection} onClick={apply}>
            {isCurrent ? "Use this branch" : "Switch clinic"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
