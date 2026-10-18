"use client";

import { MetricCard } from "@/components/application/metric-card";
import { StatusBadge } from "@/components/application/status-badge";
import { FilePenLine, ListChecks, Users } from "lucide-react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import Link from "next/link";
import type { ReactNode } from "react";
import { z } from "zod";
import { useWorkspace } from "./workspace-provider";
import { useTheme } from "@/features/branding/theme-provider";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState, timeLabel } from "@/features/patients/feedback";
import { ClinicalDashboardDocument } from "@/lib/graphql/generated";

const schema = z.object({
  follow_ups: z.array(
    z.object({
      id: z.string(),
      patient_id: z.string(),
      instructions: z.string(),
      due_date: z.string().nullable(),
    }),
  ),
  patient_count: z.number(),
  draft_count: z.number(),
  pending_treatment_count: z.number(),
  recent_consultations: z.array(
    z.object({
      id: z.string(),
      patient_name: z.string(),
      status: z.string(),
      updated_at: z.string(),
      provider_name: z.string().optional(),
    }),
  ),
  recent_documents: z.array(
    z.object({ id: z.string(), patient_id: z.string(), label: z.string(), scan_state: z.string() }),
  ),
});

export function ClinicalWidgets({ recentPatients }: { recentPatients: ReactNode }) {
  const { organizationId, href, can } = useWorkspace();
  const { appearance } = useTheme();
  const remote = useRemote(ClinicalDashboardDocument, { organizationId });
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  const parsed = schema.safeParse(remote.data.clinicDashboard);
  if (!parsed.success) return <p role="alert">Dashboard information could not be loaded.</p>;
  const data = parsed.data;
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Authorized patients"
          value={data.patient_count}
          icon={<Users />}
          description="Patient records available to you"
        />
        {can("patients.clinical.read") && (
          <>
            <MetricCard
              label="Open drafts"
              value={data.draft_count}
              icon={<FilePenLine />}
              description="Consultations awaiting completion"
            />
            <MetricCard
              label="Pending treatments"
              value={data.pending_treatment_count}
              icon={<ListChecks />}
              description="Proposed or ongoing plan items"
            />
          </>
        )}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {appearance.personal.widgets
          .filter(
            (widget) =>
              widget.visible && (widget.id === "recent_patients" || can("patients.clinical.read")),
          )
          .map((widget) => (
            <section
              data-widget={widget.id}
              key={widget.id}
              data-panel
              className={`min-w-0 rounded-lg border border-border bg-card p-5 ${widget.size === "wide" ? "lg:col-span-2" : ""}`}
            >
              {widget.id !== "recent_patients" && (
                <h2 className="mb-4 text-xl font-semibold">
                  {
                    (
                      {
                        recent_consultations: "Recent consultations",
                        draft_notes: "Draft notes",
                        pending_treatments: "Pending treatments",
                        follow_ups: "Follow-ups",
                        recent_documents: "Recent documents",
                      } as Record<string, string>
                    )[widget.id]
                  }
                </h2>
              )}
              {widget.id === "recent_patients" && recentPatients}
              {widget.id === "recent_consultations" &&
                (data.recent_consultations.length ? (
                  <Table>
                    <caption className="sr-only">Recent authorized consultations</caption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recent_consultations.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="py-4">
                            <Link
                              className="font-medium text-primary hover:underline"
                              href={href(`/clinic/consultations/${item.id}`)}
                            >
                              {item.patient_name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.provider_name ?? "Unavailable"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {timeLabel(item.updated_at)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge value={item.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No consultations available to you yet.
                  </p>
                ))}
              {widget.id === "draft_notes" && (
                <p className="text-sm">
                  {data.draft_count} open consultation{data.draft_count === 1 ? "" : "s"}.{" "}
                  {can("patients.clinical.read") && (
                    <Link href={href("/clinic/consultations")} className="text-primary underline">
                      Review drafts
                    </Link>
                  )}
                </p>
              )}
              {widget.id === "pending_treatments" && (
                <p className="text-sm">
                  {data.pending_treatment_count} proposed or ongoing plan items in your authorized
                  patient records.
                </p>
              )}
              {widget.id === "follow_ups" &&
                (data.follow_ups.length ? (
                  <ul className="grid gap-4">
                    {data.follow_ups.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={href(`/clinic/patients/${item.patient_id}`)}
                          className="text-sm text-primary underline"
                        >
                          {item.instructions.slice(0, 120)}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.due_date ? `Review ${item.due_date}` : "No date set"}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No open follow-ups recorded.</p>
                ))}
              {widget.id === "recent_documents" &&
                (data.recent_documents.length ? (
                  <ul className="grid gap-4">
                    {data.recent_documents.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={href(`/clinic/patients/${item.patient_id}`)}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {item.label}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">{item.scan_state}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No documents available to you yet.
                  </p>
                ))}
            </section>
          ))}
      </div>
    </div>
  );
}
