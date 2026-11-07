"use client";

import { PersonIdentity } from "@/components/application/person-identity";

import { writtenDate } from "@/components/application/date-input";

import { ReasonField } from "@/components/application/reason-field";
import { reasonSuggestions } from "@/lib/reason-suggestions";

import { Clock3, Stethoscope } from "lucide-react";
import { EntrySheet } from "@/components/application/entry-sheet";
import { StatusBadge } from "@/components/application/status-badge";
import { MetricCard } from "@/components/application/metric-card";
import { useState } from "react";
import { useUrlState } from "@/features/workspace/use-url-state";
import { useCursorHistory } from "@/components/application/use-cursor-history";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { LoadState, PageHeading, RemoteNotice } from "@/features/patients/feedback";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety } from "@/features/workspace/safety-provider";
import { OperationQueueDocument } from "@/lib/graphql/generated";
import { OperationNotice, OperationSection, OperationsRefresh } from "./controls";
import { queueSchema, type OperationsSetup, type Ticket } from "./schema";
import { useOperationsAction, useOperationsSetup } from "./use-operations";
import { BookingForm } from "./booking-form";

export function QueuePage() {
  const remote = useOperationsSetup();
  if (!remote.setup) return <LoadState error={remote.error} retry={remote.reload} />;
  return (
    <div className="grid gap-7">
      <PageHeading
        title="Clinic queue"
        description="Check in patients, coordinate care and communicate delays."
      />
      <QueueBoard key={remote.setup.branch_id} setup={remote.setup} />
    </div>
  );
}
function QueueBoard({ setup }: { setup: OperationsSetup }) {
  const { organizationId, can } = useWorkspace();
  const [provider, setProvider] = useUrlState("queueProvider", "all", [
    "all",
    ...setup.providers.map((row) => row.id),
  ]);
  const [cursors, setCursors] = useCursorHistory(`${setup.branch_id}:${provider}`);
  const after = cursors[cursors.length - 1];
  const setAfter = (value: string | null) => setCursors(value ? [...cursors, value] : [null]);
  const remote = useRemote(
    OperationQueueDocument,
    {
      organizationId,
      branchId: setup.branch_id,
      providerId: provider === "all" ? null : provider,
      after,
    },
    { refreshOnFocus: false },
  );
  const parsed = queueSchema.safeParse(remote.data?.branchQueue);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <OperationsRefresh refresh={remote.reload} busy={remote.loading} />
        {can("queues.manage") && (
          <EntrySheet
            title="Check in a walk-in"
            triggerVariant="default"
            description="Record arrival and assign a provider. Clinical notes are documented in the consultation."
          >
            <div className="min-w-0">
              <BookingForm setup={setup} reload={remote.reload} walkIn />
            </div>
          </EntrySheet>
        )}
      </div>
      <OperationSection title="Patients in the clinic" surface={false}>
        <div className="max-w-sm">
          <FormSelect
            id="queue-provider"
            label="Queue provider filter"
            value={provider}
            onChange={(value) => {
              setProvider(value);
              setAfter(null);
            }}
            options={[
              { value: "all", label: "All permitted providers" },
              ...setup.providers.map((row) => ({
                value: row.id,
                label: row.name,
                person: { kind: "provider" as const, name: row.name, imageId: row.photo_id },
              })),
            ]}
          />
        </div>
        {!parsed.success ? (
          <LoadState error={remote.error} retry={remote.reload} />
        ) : (
          <>
            <RemoteNotice error={remote.error} retry={remote.reload} />
            <p className="text-xs leading-5 text-muted-foreground">
              Manual updates · Last read{" "}
              {new Intl.DateTimeFormat("en-PH", {
                timeStyle: "short",
                timeZone: setup.timezone,
              }).format(new Date(parsed.data.updated_at))}{" "}
              · {setup.timezone}. Refresh keeps this provider and queue page.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Waiting"
                value={parsed.data.waiting}
                icon={<Clock3 />}
                tone="amber"
                description="Checked in and awaiting care"
              />
              <MetricCard
                label="In consultation"
                value={parsed.data.in_service}
                icon={<Stethoscope />}
                tone="teal"
                description="Patients currently receiving care"
              />
            </div>
            {!parsed.data.items.length && (
              <p className="py-6 text-sm text-muted-foreground">
                No active tickets. Check in an appointment or add a walk-in.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <h3 className="text-base font-semibold">Service order</h3>
              <span className="text-xs text-muted-foreground">
                Priority and recorded delays included
              </span>
            </div>
            {parsed.data.items.map((row) => (
              <QueueRow
                key={`${row.id}:${row.version}`}
                row={row}
                peers={parsed.data.items}
                reload={remote.reload}
              />
            ))}
            <div className="flex flex-wrap gap-3">
              {cursors.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCursors(cursors.slice(0, -1))}
                >
                  Previous queue page
                </Button>
              )}
              {after && (
                <Button type="button" variant="outline" onClick={() => setAfter(null)}>
                  First queue page
                </Button>
              )}
              {parsed.data.has_next_page && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAfter(parsed.data.end_cursor)}
                >
                  More queue tickets
                </Button>
              )}
            </div>
          </>
        )}
      </OperationSection>
    </>
  );
}
export function QueueRow({
  row,
  peers,
  reload,
  compact = false,
}: {
  row: Ticket;
  peers: Ticket[];
  reload: () => void;
  compact?: boolean;
}) {
  const action = useOperationsAction();
  const { href, can } = useWorkspace();
  const { confirm } = useSafety();
  const params = useSearchParams();
  const [reason, setReason] = useState("");
  const [minutes, setMinutes] = useState("5");
  const [before, setBefore] = useState("end");
  const [encounter, setEncounter] = useState(params.get("encounter") ?? "");
  const transition = async (target: string) => {
    if (
      !(await confirm({
        title: `${target === "in_service" ? "Start service" : target === "completed" ? "Complete service" : target.replaceAll("_", " ")} for ticket ${row.number}?`,
        description:
          target === "completed"
            ? "This completes the queue visit. The clinical consultation must still be finalized separately."
            : "The server checks the latest queue state and any provider or room conflicts.",
        action: "Confirm queue change",
      }))
    )
      return;
    await action.run(
      "queue_action",
      { id: row.id, expected_version: row.version, target, reason, minutes: Number(minutes) },
      reload,
    );
  };
  return (
    <article
      aria-label={`Queue ticket ${row.number}`}
      className="grid min-w-0 gap-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex min-h-14 min-w-14 shrink-0 items-center justify-center rounded-xl bg-secondary px-3 text-2xl font-bold text-primary tabular-nums"
            aria-label={`Ticket number ${row.number}`}
          >
            {row.number}
          </span>
          <div>
            <h3 className="font-semibold wrap-anywhere">
              <PersonIdentity
                kind="patient"
                name={row.patient ?? "Patient"}
                imageId={row.patient_portrait_id}
              />
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {row.reference} ·{" "}
              <PersonIdentity kind="provider" name={row.provider} imageId={row.provider_photo_id} />{" "}
              · <StatusBadge value={row.status} /> · Service day {writtenDate(row.day)}
            </p>
          </div>
        </div>
        <p className="text-sm font-medium">
          {row.estimate?.label ?? "Estimate unavailable"}
          {row.delay ? ` · ${row.delay} min recorded delay` : ""}
        </p>
      </div>
      <OperationNotice message={action.message} error={action.error} />
      <div className="flex flex-wrap gap-2">
        {row.status === "waiting" && (
          <Button type="button" disabled={action.busy} onClick={() => void transition("called")}>
            Call patient
          </Button>
        )}
        {row.status === "called" && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={action.busy}
              onClick={() => void transition("recall")}
            >
              Recall number
            </Button>
            <Button
              type="button"
              disabled={action.busy}
              onClick={() => void transition("in_service")}
            >
              Start service
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={action.busy || !reason.trim()}
              onClick={() => void transition("waiting")}
            >
              Return to waiting
            </Button>
          </>
        )}
        {row.status === "in_service" && (
          <Button type="button" disabled={action.busy} onClick={() => void transition("completed")}>
            Complete service
          </Button>
        )}
        {row.encounter_id && can("encounters.write") && (
          <ButtonLink variant="outline" href={href(`/clinic/consultations/${row.encounter_id}`)}>
            Open consultation
          </ButtonLink>
        )}
      </div>
      {!row.encounter_id && can("encounters.write") && (
        <div className="grid gap-3">
          {row.setup_blockers?.length ? (
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {row.setup_blockers.map((blocker) => (
                <li key={blocker.code}>
                  {blocker.message} {blocker.action}
                </li>
              ))}
            </ul>
          ) : (
            <ButtonLink
              variant="outline"
              href={`${href("/clinic/consultations/new")}&patient=${row.patient_id}&ticket=${row.id}&ticketVersion=${row.version}`}
            >
              Start consultation for patient
            </ButtonLink>
          )}
        </div>
      )}
      {!compact && (
        <details>
          <summary className="min-h-11 cursor-pointer text-sm font-medium">
            Queue controls and care link
          </summary>
          <div className="grid gap-4 pt-4">
            <div className="grid max-w-3xl gap-4 sm:grid-cols-[1fr_10rem]">
              <ReasonField
                id={`queue-reason-${row.id}`}
                label="Operational reason"
                hint="Required for delays, reordering, absence and cancellation."
                value={reason}
                onValueChange={setReason}
                suggestions={reasonSuggestions.queue}
              />
              <FormField id={`queue-minutes-${row.id}`} label="Minutes">
                <Input
                  id={`queue-minutes-${row.id}`}
                  type="number"
                  min={0}
                  max={240}
                  step={5}
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                />
              </FormField>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={action.busy || !reason.trim()}
                onClick={() => void transition("delay")}
              >
                Record delay
              </Button>
              {row.status === "in_service" && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={action.busy || !reason.trim()}
                  onClick={() => void transition("extend")}
                >
                  Extend service
                </Button>
              )}
              {row.status !== "in_service" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={action.busy || !reason.trim()}
                    onClick={() => void transition("cancelled")}
                  >
                    Cancel ticket
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={action.busy || !reason.trim()}
                    onClick={() => void transition("no_show")}
                  >
                    Mark absent
                  </Button>
                </>
              )}
            </div>
            {row.status !== "in_service" && (
              <div className="flex max-w-2xl flex-wrap items-end gap-3">
                <FormSelect
                  id={`move-ticket-${row.id}`}
                  label="Move before ticket"
                  value={before}
                  onChange={setBefore}
                  options={[
                    { value: "end", label: "End of this provider’s queue" },
                    ...peers
                      .filter(
                        (item) =>
                          item.id !== row.id &&
                          item.provider_id === row.provider_id &&
                          item.status !== "in_service",
                      )
                      .map((item) => ({ value: item.id, label: `Ticket ${item.number}` })),
                  ]}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={action.busy || !reason.trim()}
                  onClick={async () => {
                    if (
                      await confirm({
                        title: "Reorder this ticket?",
                        description: "The recorded reason will be retained in operational history.",
                        action: "Move ticket",
                      })
                    )
                      await action.run(
                        "move",
                        {
                          id: row.id,
                          expected_version: row.version,
                          before_id: before === "end" ? null : before,
                          reason,
                        },
                        reload,
                      );
                  }}
                >
                  Move ticket
                </Button>
              </div>
            )}
            {can("encounters.write") && !row.encounter_id && (
              <form
                noValidate
                className="flex max-w-2xl flex-wrap items-end gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void action.run(
                    "link",
                    { id: row.id, encounter_id: encounter, expected_version: row.version },
                    reload,
                  );
                }}
              >
                <FormField
                  id={`queue-encounter-${row.id}`}
                  label="Existing consultation ID"
                  hint="Use the ID from the consultation address after saving care."
                >
                  <Input
                    id={`queue-encounter-${row.id}`}
                    value={encounter}
                    onChange={(event) => setEncounter(event.target.value)}
                  />
                </FormField>
                <Button type="submit" variant="outline" disabled={action.busy || !encounter}>
                  Link consultation
                </Button>
              </form>
            )}
          </div>
        </details>
      )}
    </article>
  );
}
