"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { PatientDirectoryDocument, type PatientRowFragment } from "@/lib/graphql/generated";
import { dateLabel } from "@/features/patients/feedback";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { RecentPatients } from "./recent-patients";
import { LoadState } from "@/features/patients/feedback";

export function PatientPicker({ onSelect }: { onSelect: (patient: PatientRowFragment) => void }) {
  const { organizationId } = useWorkspace();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [after, setAfter] = useState<string | null>(null);
  const remote = useRemote(PatientDirectoryDocument, {
    organizationId,
    query,
    sort: "name_asc",
    after,
  });
  return (
    <section className="grid gap-4" aria-label="Choose an authorized patient">
      {!query && <RecentPatients choose={onSelect} />}
      <div className="flex gap-2">
        <Input
          aria-label="Search patients"
          placeholder="Search by name or patient reference"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={160}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              setAfter(null);
              setQuery(input);
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setAfter(null);
            setQuery(input);
          }}
        >
          <Search /> Search
        </Button>
      </div>
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : (
        <>
          <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-card">
            {remote.data.clinicPatients.items.map((patient) => (
              <li key={patient.id}>
                <button
                  type="button"
                  className="flex min-h-16 w-full flex-wrap items-center justify-between gap-2 p-4 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => onSelect(patient)}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <PatientAvatar name={patient.fullName} />
                    <span className="font-semibold wrap-anywhere">{patient.fullName}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {patient.reference}
                    {patient.dateOfBirth ? ` · ${dateLabel(patient.dateOfBirth)}` : ""}
                  </span>
                </button>
              </li>
            ))}
            {!remote.data.clinicPatients.items.length && (
              <li className="p-5 text-sm text-muted-foreground">
                No permitted patients match this search.
              </li>
            )}
          </ul>
          <div className="flex justify-between gap-3">
            <Button type="button" variant="ghost" disabled={!after} onClick={() => setAfter(null)}>
              First page
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!remote.data.clinicPatients.hasNextPage}
              onClick={() => setAfter(remote.data!.clinicPatients.endCursor ?? null)}
            >
              More patients
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
