"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { AccessRequired } from "@/components/application/access-required";
import { EntrySheet } from "@/components/application/entry-sheet";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { LoadState } from "@/features/patients/feedback";
import { useSafety, useUnsavedChanges } from "@/features/workspace/safety-provider";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { OperationNotice } from "./controls";
import type { OperationsSetup } from "./schema";
import { useOperationsAction, useOperationsSetup } from "./use-operations";
import { ScheduleWeek } from "./schedule-week";
import { ScheduleLayout } from "./schedule-layout";
import { SavedWindowsPanel, ScheduleResources } from "./schedule-panels";
import { WeeklyAvailabilityForm } from "./weekly-availability-form";
import { DateAvailability } from "./date-availability";

type Schedule = OperationsSetup["schedules"][number];
type Resource = OperationsSetup["resources"][number];

export function SchedulesPage() {
  const remote = useOperationsSetup();
  const { can, href } = useWorkspace();
  if (!can("operations.read"))
    return (
      <AccessRequired
        title="Schedule access required"
        description="Ask your clinic administrator for access to clinic operations."
      />
    );
  if (!remote.setup) return <LoadState error={remote.error} retry={remote.reload} />;
  return (
    <ScheduleWorkspace
      key={remote.setup.branch_id}
      setup={remote.setup}
      manageable={can("schedules.manage")}
      reload={remote.reload}
      calendarHref={href("/clinic/appointments")}
    />
  );
}

function ScheduleWorkspace({
  setup,
  manageable,
  reload,
  calendarHref,
}: {
  setup: OperationsSetup;
  manageable: boolean;
  reload: () => void;
  calendarHref: string;
}) {
  const action = useOperationsAction();
  const { confirm, guard } = useSafety();
  const [editing, setEditing] = useState<Schedule | undefined>();
  const [provider, setProvider] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [resourceRow, setResourceRow] = useState<Resource | undefined>();
  const [resourceName, setResourceName] = useState("");
  const resourceKey = `schedule-resource:${setup.branch_id}`;
  const resetResource = useCallback(() => setResourceName(resourceRow?.name ?? ""), [resourceRow]);
  useUnsavedChanges(
    resourceKey,
    resourceOpen && resourceName !== (resourceRow?.name ?? ""),
    resetResource,
  );
  const current = editing
    ? (setup.schedules.find((row) => row.id === editing.id) ?? editing)
    : undefined;
  const openAvailability = (providerId = "") => {
    setEditing(undefined);
    setProvider(providerId);
    setSheetOpen(true);
  };
  const openResource = (row?: Resource) => {
    setResourceRow(row);
    setResourceName(row?.name ?? "");
    setResourceOpen(true);
  };
  const closeResource = () => void guard(() => setResourceOpen(false), false, [resourceKey]);
  return (
    <ScheduleLayout
      calendarHref={calendarHref}
      manageable={manageable}
      addAvailability={
        manageable && (
          <EntrySheet
            open={sheetOpen}
            onOpenChange={(open) => {
              setSheetOpen(open);
              if (!open) setEditing(undefined);
            }}
            trigger={
              <>
                <Plus className="size-4" />
                Add availability
              </>
            }
            triggerVariant="default"
            title={editing ? "Edit weekly availability" : "Add weekly availability"}
            description="Set recurring weekdays and hours. Date overrides apply to individual days."
            draftKeys={[`weekly-availability:${setup.branch_id}:${current?.id ?? "new"}`]}
          >
            <WeeklyAvailabilityForm
              key={current ? `${current.id}:${current.version}` : `new:${provider}`}
              setup={setup}
              initial={current}
              providerId={provider || undefined}
              saved={() => {
                setEditing(undefined);
                setSheetOpen(false);
                reload();
              }}
            />
          </EntrySheet>
        )
      }
    >
      <OperationNotice message={action.message} error={action.error} />
      <ScheduleWeek
        setup={setup}
        add={manageable ? openAvailability : undefined}
        viewWindows={
          manageable
            ? (providerId) => {
                setProviderFilter(providerId);
                document.getElementById("saved-windows")?.scrollIntoView({ block: "start" });
              }
            : undefined
        }
      />
      {manageable ? (
        <>
          <SavedWindowsPanel
            setup={setup}
            providerFilter={providerFilter}
            clearFilter={() => setProviderFilter("")}
            add={() => openAvailability()}
            edit={(row) => {
              setEditing(row);
              setProvider(row.provider_id);
              setSheetOpen(true);
            }}
            busy={action.busy}
            toggle={async (row) => {
              if (
                await confirm({
                  title: row.active ? "Disable this weekly window?" : "Enable this weekly window?",
                  description:
                    "Bookings remain preserved. Conflicting schedule changes are rejected.",
                  action: row.active ? "Disable window" : "Enable window",
                })
              )
                await action.run(
                  "schedule",
                  {
                    ...row,
                    branch_id: setup.branch_id,
                    expected_version: row.version,
                    active: !row.active,
                    version: undefined,
                  },
                  reload,
                );
            }}
          />
          <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
            <ScheduleResources
              rows={setup.resources}
              add={() => openResource()}
              edit={openResource}
              busy={action.busy}
              toggle={async (row) => {
                if (
                  await confirm({
                    title: `${row.active ? "Disable" : "Enable"} ${row.name}?`,
                    description:
                      "A resource with active reservations cannot be disabled. Existing bookings remain preserved.",
                    action: row.active ? "Disable resource" : "Enable resource",
                  })
                )
                  await action.run(
                    "resource",
                    {
                      id: row.id,
                      name: row.name,
                      active: !row.active,
                      expected_version: row.version,
                      branch_id: setup.branch_id,
                    },
                    reload,
                  );
              }}
            />
            <DateAvailability setup={setup} reload={reload} />
          </div>
          <Dialog
            open={resourceOpen}
            onOpenChange={(open) => {
              if (!action.busy) {
                if (open) setResourceOpen(true);
                else closeResource();
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogTitle className="pr-8 text-xl leading-7 font-semibold">
                {resourceRow ? "Rename resource" : "Add a room or chair"}
              </DialogTitle>
              <DialogDescription>
                {resourceRow
                  ? "Update its display name. Reservations and availability stay the same."
                  : "Name a shared space or resource that can be reserved for appointments in this branch."}
              </DialogDescription>
              <OperationNotice message="" error={action.error} />
              <form
                noValidate
                className="grid gap-5"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!resourceName.trim() || action.busy) return;
                  await action.run(
                    "resource",
                    {
                      branch_id: setup.branch_id,
                      name: resourceName.trim(),
                      ...(resourceRow
                        ? {
                            id: resourceRow.id,
                            expected_version: resourceRow.version,
                            active: resourceRow.active,
                          }
                        : {}),
                    },
                    () => {
                      setResourceOpen(false);
                      setResourceName(resourceRow?.name ?? "");
                      reload();
                    },
                  );
                }}
              >
                <FormField
                  id="resource-name"
                  label="Resource name"
                  hint="For example, Consultation room 1 or Dental chair 2."
                >
                  <Input
                    id="resource-name"
                    maxLength={80}
                    autoFocus
                    value={resourceName}
                    disabled={action.busy}
                    onChange={(event) => setResourceName(event.target.value)}
                  />
                </FormField>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={action.busy}
                    onClick={closeResource}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={action.busy || !resourceName.trim()}
                    aria-busy={action.busy}
                  >
                    {action.busy ? "Saving…" : resourceRow ? "Save name" : "Add resource"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          You can view your availability here. Contact your clinic administrator to change working
          hours.
        </p>
      )}
    </ScheduleLayout>
  );
}
