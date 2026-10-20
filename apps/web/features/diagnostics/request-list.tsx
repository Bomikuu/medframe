"use client";

import { usePatientRecordReadOnly } from "@/features/patients/profile/patient-record-browse";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntrySheet } from "@/components/application/entry-sheet";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState, RemoteNotice, PageHeading } from "@/features/patients/feedback";
import { useClinicTime } from "@/components/application/clinical-locale";
import { DiagnosticRequestsDocument } from "@/lib/graphql/generated";
import { diagnosticPage, stateLabel } from "./schema";
import { DiagnosticRequestForm } from "./request-form";

export function DiagnosticList({
  patientId,
  context = "clinic",
}: {
  patientId?: string;
  context?: "clinic" | "center";
}) {
  const { organizationId, can, href } = useWorkspace();
  const readOnly = usePatientRecordReadOnly();
  const timeLabel = useClinicTime();
  const permitted = can(context === "center" ? "diagnostics.center.work" : "diagnostics.read");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState({ query: "", status: null as string | null });
  const [after, setAfter] = useState<string | null>(null);
  const remote = useRemote(
    DiagnosticRequestsDocument,
    {
      organizationId,
      context,
      filters: query,
      after,
      patientId: patientId ?? null,
    },
    { enabled: permitted },
  );
  const parsed = diagnosticPage.safeParse(remote.data?.diagnosticRequests);
  if (!permitted)
    return <p role="alert">Your membership does not have diagnostic access in this workspace.</p>;
  return (
    <section className="grid min-w-0 gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading
          title={context === "center" ? "Diagnostic inbox" : "Diagnostics"}
          description={
            context === "center"
              ? "Assigned referrals, examinations and traceable result submissions."
              : "Request examinations, share selected evidence and review results."
          }
        />
        {context === "clinic" && !readOnly && can("diagnostics.request") && (
          <Button onClick={() => setOpen(true)}>New request</Button>
        )}
      </div>
      <form
        className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setAfter(null);
          setQuery({ query: search, status: status || null });
        }}
      >
        <FormField id={`dx-search-${context}`} label="Search requests">
          <Input
            id={`dx-search-${context}`}
            value={search}
            maxLength={160}
            onChange={(e) => setSearch(e.target.value)}
          />
        </FormField>
        <FormSelect
          id={`dx-status-${context}`}
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All statuses" },
            ...[
              "draft",
              "awaiting_center",
              "sent",
              "accepted",
              "performed",
              "results_available",
              "reviewed",
              "cancelled",
            ].map((value) => ({ value, label: stateLabel(value) })),
          ]}
        />
        <Button type="submit" variant="outline">
          Apply filters
        </Button>
      </form>
      {!parsed.success ? (
        <LoadState
          error={
            remote.error ??
            (remote.data ? new Error("The diagnostic response could not be read.") : null)
          }
          retry={remote.reload}
          title="Loading diagnostic requests"
          detail="Retrieving permitted referrals, examination statuses and result availability. Filters stay available while the list loads."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <RemoteNotice error={remote.error} retry={remote.reload} />
          <ul className="divide-y divide-border">
            {parsed.data.items.map((row) => (
              <li key={row.id}>
                <Link
                  className="flex min-w-0 flex-wrap items-center justify-between gap-4 p-5 focus-visible:outline-2 focus-visible:outline-primary"
                  href={href(
                    `/clinic/${context === "center" ? "diagnostic-inbox" : "diagnostics"}/${row.id}`,
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-semibold wrap-anywhere">{row.test_name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {row.patient_name} · {row.number}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {row.center_name ?? "Awaiting center selection"} · {timeLabel(row.created_at)}
                    </p>
                  </div>
                  <span className="rounded-md bg-muted px-3 py-2 text-sm capitalize">
                    {stateLabel(row.state)}
                    {!row.sharing ? " · Sharing withdrawn" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {!parsed.data.items.length && (
            <div className="p-6">
              <h2 className="font-semibold">
                {context === "center" ? "No assigned requests" : "No matching diagnostic requests"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {context === "center"
                  ? "Authorized clinics' referrals appear after a patient selects your center."
                  : "Create a request for a patient with clinical access, or adjust the filters."}
              </p>
            </div>
          )}
          <div className="flex gap-3 border-t border-border p-5">
            <Button variant="outline" disabled={!after} onClick={() => setAfter(null)}>
              Newest records
            </Button>
            <Button
              variant="outline"
              disabled={!parsed.data.has_next_page}
              onClick={() => setAfter(parsed.data.end_cursor)}
            >
              Older records
            </Button>
          </div>
        </div>
      )}
      <EntrySheet
        open={open}
        onOpenChange={setOpen}
        title="New diagnostic request"
        description="Save a draft, then preview the exact package before sharing."
      >
        <DiagnosticRequestForm
          patientId={patientId}
          onSaved={() => {
            setOpen(false);
            remote.reload();
          }}
        />
      </EntrySheet>
    </section>
  );
}
