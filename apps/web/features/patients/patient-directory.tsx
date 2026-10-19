"use client";
import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Search, ArrowRight } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { EntrySheet } from "@/components/application/entry-sheet";
import { PatientForm } from "./patient-form";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { DataTable } from "@/components/application/data-table";
import { EmptyState } from "@/components/application/empty-state";
import { ViewSwitcher } from "@/components/application/view-switcher";
import { PatientDirectoryDocument, type PatientRowFragment } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { FormSelect } from "./form-controls";
import { useCollectionView } from "./use-collection-view";
import { useRemote } from "./use-remote";
import { LoadState, PageHeading, RemoteNotice, dateLabel } from "./feedback";

export function PatientDirectory() {
  const { organizationId, overview, workspace, href, can } = useWorkspace();
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name_asc");
  const [branch, setBranch] = useState("all");
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [view, setView] = useCollectionView(
    `${overview.currentUser.id}:${organizationId}:patients`,
    "cards",
  );
  const remote = useRemote(PatientDirectoryDocument, {
    organizationId,
    query,
    sort,
    branchId: branch === "all" ? null : branch,
    after: cursors.at(-1),
  });
  const page = remote.data?.clinicPatients;
  function resetPage() {
    setCursors([null]);
  }
  const columns: ColumnDef<PatientRowFragment>[] = [
    {
      id: "patient",
      header: "Patient",
      enableHiding: false,
      cell: ({ row: { original: patient } }) => (
        <Link
          href={href(`/clinic/patients/${patient.id}`)}
          className="flex min-w-48 items-center gap-3 font-medium hover:text-primary"
        >
          <PatientAvatar name={patient.fullName} />
          <span className="max-w-72 wrap-anywhere whitespace-normal">{patient.fullName}</span>
        </Link>
      ),
    },
    {
      id: "reference",
      accessorKey: "reference",
      header: "Reference",
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">{String(info.getValue())}</span>
      ),
    },
    {
      id: "birth date",
      header: "Date of birth",
      cell: ({ row }) => dateLabel(row.original.dateOfBirth),
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="size-11"
              aria-label={`Actions for ${row.original.fullName}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={href(`/clinic/patients/${row.original.id}`)}>Open patient</Link>
            </DropdownMenuItem>
            {can("encounters.write") && (
              <DropdownMenuItem asChild>
                <Link href={`${href("/clinic/consultations/new")}&patient=${row.original.id}`}>
                  Start consultation
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  return (
    <>
      <PageHeading
        title="Patients"
        description="Your authorized patient directory. Open a record to review history or begin care."
      >
        {can("patients.register") && (
          <EntrySheet
            title="Register patient"
            triggerVariant="default"
            description="Create a patient record. Clinical history is reviewed separately."
          >
            <PatientForm embedded />
          </EntrySheet>
        )}
      </PageHeading>
      {page && (
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <strong className="mr-2 text-xl font-semibold text-foreground">
              {page.totalCount.toLocaleString()}
            </strong>
            {query || branch !== "all" ? "matching patient records" : "authorized patient records"}
          </p>
          <p className="text-xs text-muted-foreground">
            Search, select a record and continue care.
          </p>
        </div>
      )}
      <div className="mb-6 flex min-w-0 flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <form
          role="search"
          className="flex min-w-0 flex-1 basis-64 items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(draft);
            resetPage();
            if (draft === query) remote.reload();
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="patientSearch" className="mb-2 block text-xs font-medium">
              Name or reference
            </label>
            <Input
              id="patientSearch"
              type="search"
              value={draft}
              maxLength={160}
              autoComplete="off"
              placeholder="Search patients…"
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" aria-label="Search patients">
            <Search />
          </Button>
        </form>
        <FormSelect
          id="directory-sort"
          label="Order"
          value={sort}
          onChange={(value) => {
            setSort(value);
            resetPage();
          }}
          options={[
            { value: "name_asc", label: "Name A–Z" },
            { value: "name_desc", label: "Name Z–A" },
            { value: "reference", label: "Reference" },
          ]}
        />
        <FormSelect
          id="directory-branch"
          label="Branch"
          value={branch}
          onChange={(value) => {
            setBranch(value);
            resetPage();
          }}
          options={[
            { value: "all", label: "All permitted branches" },
            ...workspace.branches.map((branch) => ({ value: branch.id, label: branch.name })),
          ]}
        />
        <ViewSwitcher value={view} onChange={setView} />
      </div>
      {!page ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : (
        <section aria-label="Patient results" aria-busy={remote.loading}>
          <RemoteNotice error={remote.error} retry={remote.reload} />
          {view !== "table" && (
            <p role="status" className="mb-4 text-sm text-muted-foreground">
              {page.totalCount.toLocaleString("en-PH")} {query ? "matching" : "available"} patients
              {remote.loading ? " · Updating…" : ""}
            </p>
          )}
          {!page.items.length ? (
            <EmptyState
              title={query ? "No matching patients" : "No patients available"}
              description={
                query
                  ? "Try another name or reference, or clear the search."
                  : "Register a patient or contact your clinic administrator to arrange access."
              }
            >
              {query && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDraft("");
                    setQuery("");
                    resetPage();
                  }}
                >
                  Clear search
                </Button>
              )}
            </EmptyState>
          ) : view === "table" ? (
            <DataTable
              columns={columns}
              data={page.items}
              caption="Authorized patient records"
              summary={`${page.totalCount.toLocaleString("en-PH")} ${query ? "matching" : "available"} patients${remote.loading ? " · Updating…" : ""}`}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {page.items.map((patient) => (
                <Card
                  key={patient.id}
                  data-panel
                  className="rounded-xl border border-border py-5 ring-0 transition-colors hover:border-input"
                >
                  <CardContent className="grid gap-4 px-5">
                    <div className="flex items-center gap-3">
                      <PatientAvatar name={patient.fullName} className="size-14 text-base" />
                      <div className="min-w-0">
                        <Link
                          className="font-semibold wrap-anywhere hover:text-primary"
                          href={href(`/clinic/patients/${patient.id}`)}
                        >
                          {patient.fullName}
                        </Link>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {patient.reference}
                        </p>
                      </div>
                    </div>
                    <dl className="border-t border-border pt-4 text-sm">
                      <dt className="text-xs text-muted-foreground">Date of birth</dt>
                      <dd className="mt-1">{dateLabel(patient.dateOfBirth)}</dd>
                    </dl>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                      <ButtonLink
                        variant="link"
                        className="h-auto p-0"
                        href={href(`/clinic/patients/${patient.id}`)}
                      >
                        Open record <ArrowRight className="size-4" />
                      </ButtonLink>
                      {can("encounters.write") && (
                        <ButtonLink
                          variant="outline"
                          size="sm"
                          href={`${href("/clinic/consultations/new")}&patient=${patient.id}`}
                        >
                          Start consultation
                        </ButtonLink>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Page {cursors.length}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={cursors.length === 1 || remote.loading}
                onClick={() => setCursors((values) => values.slice(0, -1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={!page.hasNextPage || remote.loading}
                onClick={() => setCursors((values) => [...values, page.endCursor])}
              >
                Next
              </Button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
