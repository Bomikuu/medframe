"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { OperationsSetupDocument } from "@/lib/graphql/generated";
import { useRemote } from "./use-remote";
import { failureText } from "./feedback";

const patientSchema = z.object({
  id: z.string(),
  name: z.string(),
  reference: z.string(),
  portrait_id: z.string().nullable().optional(),
});
export type PatientSuggestion = z.infer<typeof patientSchema>;

/** Navigation and form selection share the same scoped suggestion dialog. */
export function PatientSearchDialog({
  open,
  onOpenChange,
  select,
  branchId,
  title = "Find a patient",
  description = "Search by patient name or clinic reference.",
  actionLabel = "Open patient record",
  initialSearch = "",
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  select: (patient: PatientSuggestion) => void;
  branchId?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  initialSearch?: string;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-xl"
      >
        <DialogTitle className="flex items-center gap-2 pr-7">
          <Search aria-hidden className="size-5 text-teal-ink" />
          {title}
        </DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        {open && (
          <PatientSuggestions
            key={branchId}
            branchId={branchId}
            initialSearch={initialSearch}
            actionLabel={actionLabel}
            select={(patient) => {
              onOpenChange(false);
              select(patient);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PatientSuggestions({
  branchId,
  select,
  actionLabel,
  initialSearch,
}: {
  branchId?: string;
  select: (patient: PatientSuggestion) => void;
  actionLabel: string;
  initialSearch: string;
}) {
  const { organizationId, branchId: currentBranch } = useWorkspace();
  const [search, setSearch] = useState(initialSearch);
  const [query, setQuery] = useState(initialSearch.trim());
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const remote = useRemote(OperationsSetupDocument, {
    organizationId,
    branchId: branchId || currentBranch || null,
    search: query,
  });
  const parsed = z
    .object({ patients: z.array(patientSchema) })
    .safeParse(remote.data?.operationsSetup);
  const pending = remote.loading || search.trim() !== query;
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <label htmlFor="patient-suggestion-search" className="sr-only">
        Patient name or clinic reference
      </label>
      <div className="relative">
        <Search aria-hidden className="absolute top-3.5 left-3 size-4 text-muted-foreground" />
        <Input
          id="patient-suggestion-search"
          type="search"
          maxLength={160}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or reference…"
          className="pr-10 pl-10"
        />
        {search && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Clear patient search"
            className="absolute top-0.5 right-1 size-10"
            onClick={() => setSearch("")}
          >
            <X aria-hidden className="size-4" />
          </Button>
        )}
      </div>
      <div
        className="min-h-36 overflow-y-auto overscroll-contain"
        aria-label="Patient suggestions"
        aria-busy={pending}
      >
        {pending ? (
          <p role="status" className="py-8 text-center text-sm text-muted-foreground">
            Finding patients…
          </p>
        ) : remote.error ? (
          <div role="alert" className="grid gap-3 py-5 text-sm text-destructive">
            <p>{failureText(remote.error)}</p>
            <Button variant="outline" onClick={remote.reload}>
              Try again
            </Button>
          </div>
        ) : !parsed.success ? (
          <p role="alert" className="py-5 text-sm text-destructive">
            Patient suggestions are unavailable. Close this dialog and try again.
          </p>
        ) : !parsed.data.patients.length ? (
          <p role="status" className="py-8 text-center text-sm text-muted-foreground">
            No patients match this search in the selected branch.
          </p>
        ) : (
          <ul className="grid gap-1">
            {parsed.data.patients.map((patient) => (
              <li key={patient.id}>
                <button
                  type="button"
                  aria-label={`${actionLabel}: ${patient.name}, ${patient.reference}`}
                  onClick={() => select(patient)}
                  className="flex min-h-16 w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-teal-soft/60 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <PatientAvatar
                    name={patient.name}
                    imageId={patient.portrait_id ?? undefined}
                    className="size-10"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{patient.name}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {patient.reference}
                    </span>
                  </span>
                  <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="border-t border-border pt-3 text-xs text-muted-foreground">
        {query ? "Matching patients" : "Suggestions from the current branch"} · up to 50 results.
        Type a name or reference to narrow the list.
      </p>
    </div>
  );
}
