"use client";

import { EntrySheet } from "@/components/application/entry-sheet";
import { useCallback, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { LoadState, PageHeading } from "@/features/patients/feedback";
import { useSafety, useUnsavedChanges } from "@/features/workspace/safety-provider";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { BranchChoice, OperationNotice, OperationSection } from "./controls";
import { localDate, type OperationsSetup } from "./schema";
import { useOperationsAction, useOperationsSetup } from "./use-operations";

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const scheduleSchema = z
  .object({
    provider_id: z.string().min(1, "Choose a provider."),
    weekday: z.string(),
    effective_from: z.string().min(1),
    effective_to: z.string().min(1),
    opens: z.string().min(1),
    closes: z.string().min(1),
    duration: z
      .string()
      .refine(
        (value) => Number(value) >= 5 && Number(value) <= 240 && Number(value) % 5 === 0,
        "Use 5–240 minutes in five-minute increments.",
      ),
  })
  .refine((value) => value.opens < value.closes, {
    path: ["closes"],
    message: "Closing must be after opening.",
  })
  .refine((value) => value.effective_from <= value.effective_to, {
    path: ["effective_to"],
    message: "End date must follow the start date.",
  });
type ScheduleValues = z.infer<typeof scheduleSchema>;

export function SchedulesPage() {
  const [branch, setBranch] = useState("");
  const remote = useOperationsSetup(branch);
  const { guard } = useSafety();
  const { can } = useWorkspace();
  if (!can("schedules.manage"))
    return <p role="alert">Only your clinic administrator can change schedules.</p>;
  if (!remote.setup) return <LoadState error={remote.error} retry={remote.reload} />;
  return (
    <div className="grid gap-7">
      <PageHeading
        title="Provider schedules"
        description={`Opening windows and room capacity · ${remote.setup.timezone}`}
      />
      <BranchChoice setup={remote.setup} change={(value) => void guard(() => setBranch(value))} />
      <ScheduleEditor key={remote.setup.branch_id} setup={remote.setup} reload={remote.reload} />
    </div>
  );
}

function ScheduleEditor({ setup, reload }: { setup: OperationsSetup; reload: () => void }) {
  const action = useOperationsAction();
  const { confirm } = useSafety();
  const [editing, setEditing] = useState<string | null>(null);
  const today = localDate(setup.timezone);
  const defaults: ScheduleValues = {
    provider_id: setup.providers[0]?.id ?? "",
    weekday: "0",
    effective_from: today,
    effective_to: `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`,
    opens: "09:00",
    closes: "17:00",
    duration: "30",
  };
  const form = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: defaults,
  });
  const scheduleValues = useWatch({ control: form.control });
  const discard = useCallback(() => {
    form.reset();
  }, [form]);
  useUnsavedChanges(`operations-schedule:${setup.branch_id}`, form.formState.isDirty, discard);
  const current = setup.schedules.find((row) => row.id === editing);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resource, setResource] = useState("");
  const [closureDate, setClosureDate] = useState(today);
  const save = form.handleSubmit(async (values) => {
    const success = await action.run(
      "schedule",
      {
        ...values,
        weekday: Number(values.weekday),
        duration: Number(values.duration),
        branch_id: setup.branch_id,
        ...(current ? { id: current.id, expected_version: current.version } : {}),
      },
      reload,
    );
    if (success) {
      form.reset(defaults);
      setEditing(null);
      setSheetOpen(false);
    }
  });
  return (
    <>
      <OperationNotice message={action.message} error={action.error} />
      <EntrySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? "Edit availability window" : "Add availability window"}
      >
        {!setup.providers.length ? (
          <p className="text-sm">
            No active providers. Provision a Doctor or Dentist membership with a provider profile
            first.
          </p>
        ) : (
          <form noValidate onSubmit={save} className="@container grid min-w-0 gap-5">
            <FormSelect
              id="schedule-provider"
              label="Provider"
              value={scheduleValues.provider_id ?? ""}
              onChange={(value) => form.setValue("provider_id", value, { shouldDirty: true })}
              options={setup.providers.map((row) => ({ value: row.id, label: row.name }))}
            />
            <div className="grid max-w-3xl min-w-0 gap-4 @[480px]:grid-cols-2 @[760px]:grid-cols-3">
              <FormSelect
                id="schedule-weekday"
                label="Weekday"
                value={scheduleValues.weekday ?? "0"}
                onChange={(value) => form.setValue("weekday", value, { shouldDirty: true })}
                options={weekdays.map((label, index) => ({ value: String(index), label }))}
              />
              {(
                [
                  ["effective_from", "Effective from", "date"],
                  ["effective_to", "Effective through", "date"],
                  ["opens", "Opens", "time"],
                  ["closes", "Closes", "time"],
                  ["duration", "Default visit minutes", "number"],
                ] as const
              ).map(([name, label, type]) => (
                <FormField
                  key={name}
                  id={`schedule-${name}`}
                  label={label}
                  error={form.formState.errors[name]?.message}
                >
                  <Input
                    id={`schedule-${name}`}
                    type={type}
                    {...form.register(name)}
                    aria-invalid={!!form.formState.errors[name]}
                    aria-describedby={
                      form.formState.errors[name] ? `schedule-${name}-help` : undefined
                    }
                  />
                </FormField>
              ))}
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Use separate windows for breaks and overnight schedules. Existing bookings must be
              rescheduled before removing their availability.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button disabled={action.busy} type="submit">
                {action.busy ? "Saving…" : "Save schedule"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={action.busy}
                onClick={() => {
                  setEditing(null);
                  form.reset(defaults);
                }}
              >
                Cancel changes
              </Button>
            </div>
          </form>
        )}
      </EntrySheet>
      <OperationSection title="Saved weekly windows">
        <div className="divide-y divide-border">
          {!setup.schedules.length && (
            <p className="py-4 text-sm text-muted-foreground">
              No weekly schedule yet. Add a window to make appointment slots available.
            </p>
          )}
          {setup.schedules.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium">
                  {setup.providers.find((item) => item.id === row.provider_id)?.name} ·{" "}
                  {weekdays[row.weekday]}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {row.opens.slice(0, 5)}–{row.closes.slice(0, 5)} · {row.duration} minutes ·{" "}
                  {row.effective_from} to {row.effective_to} · {row.active ? "Active" : "Inactive"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(row.id);
                    setSheetOpen(true);
                    form.reset({
                      provider_id: row.provider_id,
                      weekday: String(row.weekday),
                      effective_from: row.effective_from,
                      effective_to: row.effective_to,
                      opens: row.opens.slice(0, 5),
                      closes: row.closes.slice(0, 5),
                      duration: String(row.duration),
                    });
                  }}
                >
                  Edit window
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={action.busy}
                  onClick={async () => {
                    if (
                      await confirm({
                        title: row.active ? "Disable this window?" : "Enable this window?",
                        description:
                          "Bookings remain preserved. Conflicting schedule changes are rejected.",
                        action: "Save availability",
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
                >
                  {row.active ? "Disable" : "Enable"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </OperationSection>
      <OperationSection title="Rooms and chairs">
        <form
          noValidate
          className="flex max-w-xl flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void action.run("resource", { branch_id: setup.branch_id, name: resource }, () => {
              setResource("");
              reload();
            });
          }}
        >
          <FormField id="resource-name" label="Resource name">
            <Input
              id="resource-name"
              maxLength={80}
              value={resource}
              onChange={(event) => setResource(event.target.value)}
            />
          </FormField>
          <Button type="submit" disabled={action.busy || !resource.trim()}>
            Add resource
          </Button>
        </form>
        {setup.resources.map((row) => (
          <div className="flex flex-wrap items-center gap-4 text-sm" key={row.id}>
            <span>
              {row.name} · {row.active ? "Available" : "Inactive"}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={action.busy}
              onClick={async () => {
                if (
                  await confirm({
                    title: "Change resource availability?",
                    description: "A resource with active reservations cannot be disabled.",
                    action: "Save resource",
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
            >
              {row.active ? "Disable resource" : "Enable resource"}
            </Button>
          </div>
        ))}
      </OperationSection>
      <OverrideWindow setup={setup} reload={reload} />
      <OperationSection title="Dated closure">
        <form
          noValidate
          className="flex max-w-xl flex-wrap items-end gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (
              await confirm({
                title: "Close this branch for the day?",
                description: "This will be rejected if it conflicts with existing reservations.",
                action: "Save closure",
              })
            )
              await action.run(
                "override",
                { branch_id: setup.branch_id, date: closureDate, closed: true },
                reload,
              );
          }}
        >
          <FormField id="closure-date" label="Closure date">
            <Input
              id="closure-date"
              type="date"
              value={closureDate}
              onChange={(event) => setClosureDate(event.target.value)}
            />
          </FormField>
          <Button type="submit" variant="outline" disabled={action.busy}>
            Close branch for date
          </Button>
        </form>
        {setup.overrides.map((row) => (
          <p className="text-sm text-muted-foreground" key={row.id}>
            {row.date} · {row.closed ? "Closed" : `${row.opens}–${row.closes}`}
          </p>
        ))}
      </OperationSection>
    </>
  );
}

function OverrideWindow({ setup, reload }: { setup: OperationsSetup; reload: () => void }) {
  const action = useOperationsAction();
  const [date, setDate] = useState(localDate(setup.timezone));
  const [provider, setProvider] = useState("branch");
  const [opens, setOpens] = useState("09:00");
  const [closes, setCloses] = useState("17:00");
  const { confirm } = useSafety();
  return (
    <OperationSection title="Dated opening override">
      <p className="text-sm text-muted-foreground">
        Replace an existing closure or provider override for a single date. A branch-wide closure
        takes precedence over provider hours.
      </p>
      <OperationNotice message={action.message} error={action.error} />
      <form
        noValidate
        className="grid max-w-3xl gap-4 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const existing = setup.overrides.find(
            (row) =>
              row.date === date && row.provider_id === (provider === "branch" ? null : provider),
          );
          if (
            await confirm({
              title: "Save this dated opening?",
              description: "Existing reservations must remain covered by these hours.",
              action: "Save opening override",
            })
          )
            await action.run(
              "override",
              {
                branch_id: setup.branch_id,
                provider_id: provider === "branch" ? null : provider,
                date,
                closed: false,
                opens,
                closes,
                ...(existing ? { id: existing.id, expected_version: existing.version } : {}),
              },
              reload,
            );
        }}
      >
        <FormField id="override-date" label="Override date">
          <Input
            id="override-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </FormField>
        <FormSelect
          id="override-provider"
          label="Override scope"
          value={provider}
          onChange={setProvider}
          options={[
            { value: "branch", label: "Entire branch" },
            ...setup.providers.map((row) => ({ value: row.id, label: row.name })),
          ]}
        />
        <FormField id="override-opens" label="Override opens">
          <Input
            id="override-opens"
            type="time"
            value={opens}
            onChange={(event) => setOpens(event.target.value)}
          />
        </FormField>
        <FormField id="override-closes" label="Override closes">
          <Input
            id="override-closes"
            type="time"
            value={closes}
            onChange={(event) => setCloses(event.target.value)}
          />
        </FormField>
        <div>
          <Button type="submit" disabled={action.busy}>
            Save dated opening
          </Button>
        </div>
      </form>
    </OperationSection>
  );
}
