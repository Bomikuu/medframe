"use client";

import { ButtonLink } from "@/components/ui/button-link";

import { useRef, useState } from "react";
import Link from "next/link";
import { PlusIcon, XIcon, MagnifyingGlassIcon, ArrowRightIcon } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PatientDirectoryDocument } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "./use-remote";
import { LoadState, PageHeading, dateLabel } from "./feedback";

export function PatientDirectory() {
  const { organizationId, href, can } = useWorkspace();
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const input = useRef<HTMLInputElement>(null);
  const { data, error, loading, reload } = useRemote(PatientDirectoryDocument, {
    organizationId,
    query,
    after: cursors[cursors.length - 1],
  });
  const page = data?.clinicPatients;
  function search(value: string) {
    setQuery(value);
    setCursors([null]);
    if (value === query) reload();
  }
  return (
    <>
      <PageHeading
        title="Patients"
        description="Find a patient by name or reference within your authorized records."
      >
        {can("patients.register") && (
          <ButtonLink href={href("/clinic/patients/new")}>
            <PlusIcon />
            Register patient
          </ButtonLink>
        )}
      </PageHeading>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          search(draft);
        }}
        role="search"
        className="mb-7 flex max-w-2xl flex-wrap items-end gap-3"
      >
        <div className="min-w-0 flex-1 basis-56">
          <label htmlFor="patientSearch" className="mb-2 block text-sm font-medium">
            Name or patient reference
          </label>
          <div className="relative">
            <Input
              id="patientSearch"
              type="search"
              ref={input}
              value={draft}
              maxLength={160}
              autoComplete="off"
              onChange={(event) => setDraft(event.target.value)}
              className="pr-12"
            />
            {draft && (
              <Button
                type="button"
                variant="ghost"
                className="absolute top-0 right-0 size-11"
                aria-label="Clear patient search"
                onClick={() => {
                  setDraft("");
                  search("");
                  input.current?.focus();
                }}
              >
                <XIcon />
              </Button>
            )}
          </div>
        </div>
        <Button type="submit" variant="outline">
          <MagnifyingGlassIcon />
          Search
        </Button>
      </form>
      {!page ? (
        <LoadState error={error} retry={reload} />
      ) : (
        <section aria-label="Patient results" aria-busy={loading} className="min-h-60">
          <p role="status" className="mb-4 text-sm text-muted-foreground">
            {page.totalCount.toLocaleString("en-PH")} {query ? "matching" : "available"} patients
            {loading ? " · Updating…" : ""}
          </p>
          {!page.items.length ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-10">
              <h2 className="text-lg font-semibold">
                {query ? "No matching patients" : "No patients available yet"}
              </h2>
              <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">
                {query
                  ? "Check the spelling or search by the patient reference. Clear the search to see all records available to you."
                  : "Register a patient to begin, or ask your administrator to arrange access to an existing record."}
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Authorized patient records</caption>
              <thead className="hidden border-y border-border bg-muted/50 sm:table-header-group">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Patient
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Reference
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Date of birth
                  </th>
                  <th scope="col">
                    <span className="sr-only">Open record</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border border-y border-border">
                {page.items.map((patient) => (
                  <tr
                    key={patient.id}
                    className="relative block py-4 hover:bg-muted/40 sm:table-row sm:py-0"
                  >
                    <th
                      scope="row"
                      className="block px-2 py-1 font-medium wrap-anywhere sm:table-cell sm:px-4 sm:py-5"
                    >
                      <Link
                        className="text-primary underline-offset-4 hover:underline"
                        href={href(`/clinic/patients/${patient.id}`)}
                      >
                        {patient.fullName}
                      </Link>
                    </th>
                    <td className="block px-2 py-1 text-xs text-muted-foreground sm:table-cell sm:px-4 sm:py-5 sm:text-sm">
                      <span className="sm:hidden">Reference: </span>
                      {patient.reference}
                    </td>
                    <td className="block px-2 py-1 text-muted-foreground sm:table-cell sm:px-4 sm:py-5">
                      <span className="sm:hidden">Date of birth: </span>
                      {dateLabel(patient.dateOfBirth)}
                    </td>
                    <td className="hidden pr-4 text-right sm:table-cell">
                      <ArrowRightIcon aria-hidden="true" className="inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Page {cursors.length}</span>
            <div className="flex gap-3">
              <Button
                variant="outline"
                disabled={cursors.length === 1 || loading}
                onClick={() => setCursors((values) => values.slice(0, -1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={!page.hasNextPage || loading}
                onClick={() => setCursors((values) => [...values, page.endCursor ?? null])}
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
