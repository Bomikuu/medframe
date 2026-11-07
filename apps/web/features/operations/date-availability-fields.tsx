"use client";

import type { ReactNode } from "react";
import { CalendarClock, Save } from "lucide-react";
import { DateInput, writtenDate } from "@/components/application/date-input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import type { OperationsSetup } from "./schema";

/** The native date-override owner retains confirmation, dirty state, versions and mutation. */
export function DateAvailabilityFields({
  setup,
  preview,
  date,
  provider,
  available,
  opens,
  closes,
  busy,
  changeDate,
  changeProvider,
  changeAvailable,
  changeOpens,
  changeCloses,
}: {
  setup: OperationsSetup;
  preview?: ReactNode;
  date: string;
  provider: string;
  available: boolean;
  opens: string;
  closes: string;
  busy: boolean;
  changeDate: (value: string) => void;
  changeProvider: (value: string) => void;
  changeAvailable: (value: boolean) => void;
  changeOpens: (value: string) => void;
  changeCloses: (value: string) => void;
}) {
  return (
    <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <FormField id="custom-availability-date" label="Specific date">
        <DateInput
          id="custom-availability-date"
          required
          value={date}
          onChange={(event) => {
            if (event.target.value) changeDate(event.target.value);
          }}
        />
      </FormField>
      <FormSelect
        id="custom-availability-provider"
        label="Applies to"
        value={provider}
        onChange={changeProvider}
        options={[
          { value: "branch", label: "Entire branch" },
          ...setup.providers.map((row) => ({
            value: row.id,
            label: row.name,
            person: { kind: "provider" as const, name: row.name, imageId: row.photo_id },
          })),
        ]}
      />
      <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/60 px-3 py-3 sm:col-span-2">
        <label htmlFor="date-available" className="text-sm font-medium">
          {available ? "Available on this date" : "Closed on this date"}
        </label>
        <Switch id="date-available" checked={available} onCheckedChange={changeAvailable} />
      </div>
      {available && (
        <>
          <FormField id="custom-availability-opens" label="Opens">
            <Input
              id="custom-availability-opens"
              type="time"
              value={opens}
              onChange={(event) => changeOpens(event.target.value)}
            />
          </FormField>
          <FormField id="custom-availability-closes" label="Closes">
            <Input
              id="custom-availability-closes"
              type="time"
              value={closes}
              onChange={(event) => changeCloses(event.target.value)}
            />
          </FormField>
        </>
      )}
      {preview}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy} aria-busy={busy}>
          <Save className="size-4" />
          {busy ? "Saving override…" : "Save date override"}
        </Button>
      </div>
    </fieldset>
  );
}

export function DateAvailabilityList({
  setup,
  choose,
}: {
  setup: OperationsSetup;
  choose: (date: string, provider: string) => void;
}) {
  return (
    <div className="mt-5 divide-y divide-border border-t border-border">
      {!setup.overrides.length && (
        <p className="pt-5 text-xs leading-5 text-muted-foreground">
          No date overrides saved. Weekly availability applies unless you add an override.
        </p>
      )}
      {setup.overrides.map((row) => (
        <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-teal-ink" aria-hidden />
            <div>
              <p className="text-sm font-medium">{writtenDate(row.date)}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {row.provider_id
                  ? (setup.providers.find((item) => item.id === row.provider_id)?.name ??
                    "Unavailable provider")
                  : "Entire branch"}{" "}
                · {row.closed ? "Closed" : `${row.opens?.slice(0, 5)}–${row.closes?.slice(0, 5)}`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => choose(row.date, row.provider_id ?? "branch")}
          >
            Edit<span className="sr-only"> {writtenDate(row.date)} override</span>
          </Button>
        </div>
      ))}
    </div>
  );
}
