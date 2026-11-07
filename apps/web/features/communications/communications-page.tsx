"use client";

import { ChannelReadiness } from "./channel-readiness";
import { DeliveryState } from "./delivery-state";
import { useUrlState } from "@/features/workspace/use-url-state";
import { useCursorHistory } from "@/components/application/use-cursor-history";
import { PersonIdentity } from "@/components/application/person-identity";

import { AccessRequired } from "@/components/application/access-required";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { EntrySheet } from "@/components/application/entry-sheet";
import { StatusBadge } from "@/components/application/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { MessageSquare } from "@/components/icons";
import { FormSelect } from "@/features/patients/form-controls";
import { LoadState, PageHeading, RemoteNotice } from "@/features/patients/feedback";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety } from "@/features/workspace/safety-provider";
import { useClinicTime } from "@/components/application/clinical-locale";
import {
  CommunicationSetupDocument,
  CommunicationRemindersDocument,
} from "@/lib/graphql/generated";
import { FinancialNotice, FinancialSection, PageNavigation } from "@/features/billing/controls";
import { useFinancialAction } from "@/features/billing/use-billing";
import { communicationSetupSchema, reminderPageSchema } from "./schema";
import { PreferenceForm } from "./preference-form";
import { ReminderForm } from "./reminder-form";
import { CommunicationSettings } from "./settings-form";

export function CommunicationsPage() {
  const { can } = useWorkspace();
  if (!can("communications.manage"))
    return (
      <AccessRequired
        title="Communications access required"
        description="Your clinic membership does not have communications access."
      />
    );
  return <CommunicationWorkspace />;
}
function CommunicationWorkspace() {
  const { organizationId, branchId: branch } = useWorkspace();
  const params = useSearchParams();
  const { guard } = useSafety();
  const [patient, setPatient] = useState(params.get("patient") ?? "");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const remote = useRemote(
    CommunicationSetupDocument,
    { organizationId, branchId: branch, patientId: patient || null, search: query },
    { enabled: !!branch },
  );
  const parsed = communicationSetupSchema.safeParse(remote.data?.communicationSetup);
  if (!branch) return <p>No permitted branch is available. Contact your clinic administrator.</p>;
  if (!parsed.success) return <LoadState error={remote.error} retry={remote.reload} />;
  const setup = parsed.data;
  return (
    <div className="grid gap-6">
      <PageHeading
        title="Communications"
        description="Manage patient reminders, recipients and delivery preferences."
      />
      <div role="status" className="rounded-xl bg-teal-soft p-5 text-sm leading-6 text-teal-ink">
        <strong>
          {setup.transport === "preview"
            ? "SMS preview — no external messages are sent."
            : "Live SMS transport is configured."}
        </strong>{" "}
        Consent and source status are checked before dispatch. A provider-accepted message is not
        yet confirmed delivered.
      </div>
      <ChannelReadiness setup={setup} />
      <FinancialSection title="Patient and recipient">
        <div className="grid items-end gap-4">
          <form
            className="flex min-w-0 flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(search);
            }}
          >
            <FormField id="communication-search" label="Find patient">
              <Input
                id="communication-search"
                type="search"
                maxLength={160}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </FormField>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
        </div>
        <FormSelect
          id="communication-patient"
          label="Patient"
          personKind="patient"
          value={patient || "none"}
          onChange={(value) => void guard(() => setPatient(value === "none" ? "" : value))}
          options={[
            { value: "none", label: "Choose a patient" },
            ...(patient && !setup.patients.some((row) => row.id === patient)
              ? [{ value: patient, label: "Patient selected from current record" }]
              : []),
            ...setup.patients.map((row) => ({
              value: row.id,
              label: `${row.name} · ${row.reference}`,
            })),
          ]}
        />
        {patient && setup.preference ? (
          <div className="grid gap-4 border-t border-border pt-5">
            <p className="text-sm text-muted-foreground">
              {setup.preference.confirmed_at
                ? `Confirmed recipient: ${setup.preference.recipient_name || "Portal recipient"}. SMS ${setup.preference.sms_enabled ? "enabled" : "off"}; private portal ${setup.preference.in_app_enabled ? "enabled" : "off"}.`
                : "No recipient consent is recorded. Confirm the recipient before scheduling."}
            </p>
            <div className="flex flex-wrap gap-3">
              <EntrySheet
                title="Recipient and consent"
                description="Record the recipient's explicit choices. Existing phone details are not consent."
              >
                <PreferenceForm
                  key={`${patient}:${setup.preference.version}`}
                  setup={setup}
                  patientId={patient}
                  branchId={branch}
                  saved={remote.reload}
                />
              </EntrySheet>
              <EntrySheet
                title="Schedule reminder"
                description="Choose a source, channel and future time."
                triggerVariant="default"
              >
                <ReminderForm
                  key={patient}
                  setup={setup}
                  patientId={patient}
                  branchId={branch}
                  saved={remote.reload}
                />
              </EntrySheet>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Choose a patient to confirm consent or schedule a reminder.
          </p>
        )}
        <RemoteNotice error={remote.error} retry={remote.reload} />
      </FinancialSection>
      <DeliveryQueue key={branch} branchId={branch} />
      {setup.can_configure && (
        <FinancialSection title="Automatic reminders">
          <CommunicationSettings key={setup.settings.version} setup={setup} saved={remote.reload} />
        </FinancialSection>
      )}
    </div>
  );
}
function DeliveryQueue({ branchId }: { branchId: string }) {
  const { organizationId } = useWorkspace();
  const { confirm } = useSafety();
  const time = useClinicTime();
  const [status, setStatus] = useUrlState("deliveryStatus", "all", [
    "all",
    "scheduled",
    "preview",
    "accepted",
    "delivered",
    "retryable_failure",
    "permanent_failure",
    "unknown",
    "cancelled",
  ] as const);
  const [cursors, setCursors] = useCursorHistory(`${branchId}:${status}`);
  const after = cursors[cursors.length - 1];
  const setAfter = (value: string | null) => setCursors(value ? [...cursors, value] : [null]);
  const remote = useRemote(CommunicationRemindersDocument, {
    organizationId,
    branchId,
    filters: status === "all" ? {} : { status },
    after,
  });
  const parsed = reminderPageSchema.safeParse(remote.data?.communicationReminders);
  const action = useFinancialAction("communication");
  return (
    <FinancialSection title="Delivery queue">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-xs">
          <FormSelect
            id="delivery-status"
            label="Delivery status"
            value={status}
            onChange={(value) => {
              setAfter(null);
              setStatus(value);
            }}
            options={[
              "all",
              "scheduled",
              "preview",
              "accepted",
              "delivered",
              "retryable_failure",
              "permanent_failure",
              "unknown",
              "cancelled",
            ].map((value) => ({ value, label: value.replaceAll("_", " ") }))}
          />
        </div>
        <Button type="button" variant="outline" onClick={remote.reload}>
          Refresh delivery state
        </Button>
      </div>
      <FinancialNotice error={action.error} message={action.message} />
      {!parsed.success ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : (
        <>
          <RemoteNotice error={remote.error} retry={remote.reload} />
          {!parsed.data.items.length ? (
            <div className="grid justify-items-start gap-3 rounded-xl border border-dashed border-border p-6">
              <MessageSquare className="size-7 text-teal-ink" />
              <h3 className="font-semibold">No reminders in this view</h3>
              <p className="max-w-prose text-sm text-muted-foreground">
                Scheduled messages and their real delivery states will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {parsed.data.items.map((row) => (
                <article
                  key={row.id}
                  className="grid min-w-0 gap-4 py-5 @min-[800px]:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-semibold">
                        <PersonIdentity kind="patient" name={row.patient_name} />
                      </h3>
                      <StatusBadge value={row.state} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {row.source_kind.replaceAll("_", " ")} ·{" "}
                      {row.channel === "in_app"
                        ? "Private portal"
                        : row.transport === "preview"
                          ? "SMS preview — not sent"
                          : "SMS"}{" "}
                      · {time(row.due_at)}
                      {row.automatic ? " · Automatic" : ""}
                    </p>
                    <p className="mt-3 max-w-prose text-sm leading-6">{row.message}</p>
                    {row.error_code && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Status code: {row.error_code} · {row.attempts} attempt(s)
                      </p>
                    )}
                    <DeliveryState state={row.state} />
                    <details className="mt-3 text-xs text-muted-foreground">
                      <summary className="w-fit cursor-pointer py-2">Delivery history</summary>
                      <ul className="mt-2 grid gap-2">
                        {row.events.map((event, index) => (
                          <li key={index}>
                            {time(event.created_at)} · {event.state.replaceAll("_", " ")}
                            {event.code ? ` · ${event.code}` : ""}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    {["scheduled", "retryable_failure", "permanent_failure"].includes(
                      row.state,
                    ) && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={action.busy}
                        onClick={async () => {
                          if (
                            await confirm({
                              title: "Cancel this reminder?",
                              description:
                                "A message already accepted by the provider cannot be recalled.",
                              action: "Cancel reminder",
                            })
                          ) {
                            if (
                              await action.run("cancel", {
                                id: row.id,
                                expected_version: row.version,
                              })
                            )
                              remote.reload();
                          }
                        }}
                      >
                        Cancel reminder
                      </Button>
                    )}
                    {row.state === "retryable_failure" && row.attempts < 5 && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={action.busy}
                        onClick={async () => {
                          if (
                            await action.run("retry", { id: row.id, expected_version: row.version })
                          )
                            remote.reload();
                        }}
                      >
                        Retry eligible failure
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          <PageNavigation after={after} next={parsed.data.end_cursor} change={setAfter} />
        </>
      )}
    </FinancialSection>
  );
}
