"use client";

import { useState } from "react";
import { ArrowUpRight, History, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { StatusBadge } from "@/components/application/status-badge";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { ConsultationsDocument } from "@/lib/graphql/generated";
import { LoadState, RemoteNotice, dateLabel } from "@/features/patients/feedback";

export function StationConsultations({ patientId }: { patientId: string }) {
  const { organizationId, href } = useWorkspace();
  const [before, setBefore] = useState<string | null>(null);
  const remote = useRemote(ConsultationsDocument, { organizationId, patientId, before });
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  return (
    <section className="grid gap-4" aria-label="Patient consultations">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <History aria-hidden className="size-5 text-teal-ink" />
          Consultation history
        </h2>
        <p className="text-xs text-muted-foreground">Saved drafts and completed care</p>
      </div>
      <RemoteNotice error={remote.error} retry={remote.reload} />
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {remote.data.encounters.map((visit) => (
          <li key={visit.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <h3 className="font-semibold wrap-anywhere">{visit.reason}</h3>
              <p className="mt-2 text-xs text-muted-foreground">{dateLabel(visit.createdAt)}</p>
              <span className="mt-3 inline-block">
                <StatusBadge value={visit.status} />
              </span>
            </div>
            <ButtonLink
              variant="outline"
              className="min-h-12 gap-2"
              href={href(`/station/clinician/consultations/${visit.id}`)}
            >
              <Stethoscope aria-hidden className="size-4" />
              {["draft", "in_progress"].includes(visit.status)
                ? "Continue consultation"
                : "Review consultation"}
              <ArrowUpRight aria-hidden className="size-4" />
            </ButtonLink>
          </li>
        ))}
        {!remote.data.encounters.length && (
          <li className="p-6 text-sm leading-6 text-muted-foreground">
            No consultations on this page. Use Patient actions to start this patient’s care.
          </li>
        )}
      </ul>
      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="ghost" disabled={!before} onClick={() => setBefore(null)}>
          Latest consultations
        </Button>
        <Button
          variant="outline"
          disabled={remote.data.encounters.length < 20}
          onClick={() => setBefore(remote.data!.encounters.at(-1)!.id)}
        >
          Older consultations
        </Button>
      </div>
    </section>
  );
}
