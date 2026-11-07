"use client";

import { RecordUnavailable } from "@/components/application/record-unavailable";
import { useClinicTime } from "@/components/application/clinical-locale";

import { EmptyState } from "@/components/application/empty-state";
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
import { LoadState } from "@/features/patients/feedback";
import { ClinicalDashboardDocument } from "@/lib/graphql/generated";

export const clinicalDashboardSchema = z.object({
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
  const timeLabel = useClinicTime();
  const { organizationId, href, can, workspace } = useWorkspace();
  const { appearance } = useTheme();
  const remote = useRemote(ClinicalDashboardDocument, { organizationId });
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  const parsed = clinicalDashboardSchema.safeParse(remote.data.clinicDashboard);
  if (!parsed.success)
    return (
      <RecordUnavailable description="Dashboard information could not be loaded. Contact your clinic administrator if the problem continues." />
    );
  const data = parsed.data;
  const titles: Record<string, string> = {
    recent_consultations: "Recent consultations",
    draft_notes: "Continue documentation",
    pending_treatments: "Treatment planning",
    follow_ups: "Follow-ups",
    recent_documents: "Recent documents",
  };
  return (
    <div className="grid gap-7">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Authorized patients"
          value={data.patient_count}
          icon={<Users />}
          tone="blue"
          href={href("/clinic/patients")}
          description="Records available in your workspace"
        />
        {can("patients.clinical.read") && (
          <>
            <MetricCard
              label="Open consultations"
              value={data.draft_count}
              icon={<FilePenLine />}
              tone="teal"
              href={href("/clinic/consultations")}
              description="Drafts ready to continue"
            />
            <MetricCard
              label="Pending treatments"
              value={data.pending_treatment_count}
              icon={<ListChecks />}
              tone="amber"
              description="Proposed and ongoing plan items"
            />
          </>
        )}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-12">
        {appearance.personal.widgets
          .filter(
            (widget) =>
              widget.visible && (widget.id === "recent_patients" || can("patients.clinical.read")),
          )
          .map((widget) => (
            <section
              key={widget.id}
              data-widget={widget.id}
              data-panel
              className={`min-w-0 overflow-hidden rounded-xl border border-border bg-card p-5 sm:p-6 ${widget.size === "wide" ? "lg:col-span-12" : widget.id === "recent_patients" ? "lg:col-span-5" : widget.id === "recent_consultations" ? "lg:col-span-7" : "lg:col-span-6"}`}
            >
              {widget.id !== "recent_patients" && (
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">{titles[widget.id]}</h2>
                  {widget.id === "recent_consultations" && (
                    <Link
                      href={href("/clinic/consultations")}
                      className="shrink-0 text-xs font-semibold text-teal-ink hover:underline"
                    >
                      View all
                    </Link>
                  )}
                </div>
              )}
              {widget.id === "recent_patients" && recentPatients}
              {widget.id === "recent_consultations" &&
                (data.recent_consultations.length ? (
                  <div className="-mx-5 sm:-mx-6">
                    <Table>
                      <caption className="sr-only">Recent authorized consultations</caption>
                      <TableHeader className="bg-muted/70">
                        <TableRow>
                          <TableHead className="pl-5 sm:pl-6">Patient</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="pr-5 text-right sm:pr-6">Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.recent_consultations.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="pl-5 sm:pl-6">
                              <Link
                                className="font-semibold text-primary hover:underline"
                                href={href(`/clinic/consultations/${item.id}`)}
                              >
                                {item.patient_name}
                              </Link>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {item.provider_name ?? "Provider not recorded"}
                              </p>
                            </TableCell>
                            <TableCell>
                              <StatusBadge value={item.status} />
                            </TableCell>
                            <TableCell className="pr-5 text-right text-xs text-muted-foreground sm:pr-6">
                              <time dateTime={item.updated_at} title={timeLabel(item.updated_at)}>
                                {shortTime(item.updated_at, workspace.organization.timezone)}
                              </time>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <EmptyState
                    title="No consultations yet"
                    description="Start a consultation from an authorized patient record."
                  />
                ))}
              {widget.id === "draft_notes" && (
                <div className="flex items-center gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-soft text-teal-ink">
                    <FilePenLine className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm leading-6 text-muted-foreground">
                      {data.draft_count
                        ? `${data.draft_count} open consultation${data.draft_count === 1 ? "" : "s"} awaiting your next update.`
                        : "Your consultation documentation is up to date."}
                    </p>
                    <Link
                      href={href("/clinic/consultations")}
                      className="mt-2 inline-flex text-sm font-semibold text-teal-ink hover:underline"
                    >
                      Review consultations
                    </Link>
                  </div>
                </div>
              )}
              {widget.id === "pending_treatments" && (
                <div className="flex items-center gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
                    <ListChecks className="size-5" />
                  </span>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {data.pending_treatment_count
                      ? `${data.pending_treatment_count} proposed or ongoing items. Open the patient's treatment plan to review the next step.`
                      : "No proposed or ongoing treatment items need attention."}
                  </p>
                </div>
              )}
              {widget.id === "follow_ups" &&
                (data.follow_ups.length ? (
                  <ul className="divide-y divide-border">
                    {data.follow_ups.map((item) => (
                      <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                        <Link
                          href={href(`/clinic/patients/${item.patient_id}`)}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {item.instructions.slice(0, 120)}
                        </Link>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {item.due_date ? `Review ${item.due_date}` : "No date set"}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">
                    No open follow-ups. Upcoming reviews will appear here when recorded.
                  </p>
                ))}
              {widget.id === "recent_documents" &&
                (data.recent_documents.length ? (
                  <ul className="divide-y divide-border">
                    {data.recent_documents.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <Link
                          href={`${href(`/clinic/patients/${item.patient_id}`)}&tab=documents`}
                          className="min-w-0 text-sm font-medium wrap-anywhere text-primary hover:underline"
                        >
                          {item.label}
                        </Link>
                        <StatusBadge value={item.scan_state} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">
                    No documents available. Authorized files will appear after upload.
                  </p>
                ))}
            </section>
          ))}
      </div>
    </div>
  );
}

function shortTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}
