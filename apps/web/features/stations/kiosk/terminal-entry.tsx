"use client";

import { useState } from "react";
import { ArrowRight, BadgeCheck, Search, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { MedframeIllustration } from "@/components/illustrations/medframe-illustration";
import { PersonIdentity } from "@/components/application/person-identity";
import { EmptyState } from "@/components/application/empty-state";

export function TerminalEntry({
  clinic,
  busy,
  onIdentify,
  onStaff,
  onRegister,
}: {
  clinic: string;
  busy: boolean;
  onIdentify: (identifier: string) => Promise<void>;
  onStaff: () => void;
  onRegister: () => void;
}) {
  const [identifier, setIdentifier] = useState("");
  return (
    <section
      className="grid items-center gap-8 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]"
      aria-label="Patient terminal entry"
    >
      <div>
        <h1 className="max-w-lg text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          Welcome to {clinic}
        </h1>
        <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
          Find your patient record once, then take care of your visit here.
        </p>
        <MedframeIllustration
          name="patient-profile"
          className="mx-auto mt-6 hidden h-56 w-72 lg:block"
        />
        <p className="mt-5 flex max-w-md gap-2 text-sm leading-6 text-muted-foreground">
          <BadgeCheck className="mt-0.5 size-5 shrink-0 text-teal-ink" aria-hidden />
          Book a visit, check in, join the queue or review your bills.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-teal-soft text-teal-ink">
            <UserRound className="size-5" aria-hidden />
          </span>
          <h2 className="text-xl font-semibold">Open my patient session</h2>
        </div>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void onIdentify(identifier.trim());
          }}
        >
          <FormField
            id="terminal-identifier"
            label="Patient ID, clinic number or portal email"
            hint="Use the exact number provided by your clinic. Your portal username is your email address."
          >
            <Input
              id="terminal-identifier"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Enter your ID or email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              disabled={busy}
              className="h-12"
              required
            />
          </FormField>
          <Button type="submit" className="h-12" disabled={busy || identifier.trim().length < 2}>
            {busy ? "Finding your record…" : "Continue"}
            <ArrowRight aria-hidden />
          </Button>
        </form>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Sharing an email with family? Use your own clinic number. If you cannot find it, ask
          reception.
        </p>
        <Button
          variant="ghost"
          className="mt-3 min-h-11 w-full whitespace-normal"
          onClick={onRegister}
          disabled={busy}
        >
          New patient or don’t know your ID?
        </Button>
        <div className="mt-5 border-t pt-5">
          <p className="mb-3 text-xs leading-5 text-muted-foreground">
            Clinic staff can search for a patient and help with their visit.
          </p>
          <Button variant="outline" className="min-h-11 w-full" onClick={onStaff} disabled={busy}>
            <Users aria-hidden />
            Staff terminal
          </Button>
        </div>
      </div>
    </section>
  );
}

export type TerminalPatient = { id: string; name: string; reference: string };

export function TerminalPatientSearch({
  busy,
  onSearch,
  onSelect,
}: {
  busy: boolean;
  onSearch: (query: string) => Promise<TerminalPatient[] | undefined>;
  onSelect: (patient: TerminalPatient) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<TerminalPatient[] | null>(null);
  return (
    <section className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Find a patient</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Search this branch by name, clinic number, phone or email. Choose the correct patient to
          open their terminal actions.
        </p>
      </div>
      <form
        className="flex items-end gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await onSearch(query.trim());
          if (result) setPatients(result);
        }}
      >
        <div className="min-w-0 flex-1">
          <FormField id="staff-terminal-search" label="Patient name or clinic details">
            <Input
              id="staff-terminal-search"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPatients(null);
              }}
              placeholder="Search patients…"
              minLength={2}
              maxLength={160}
              required
              disabled={busy}
              className="h-12"
            />
          </FormField>
        </div>
        <Button
          type="submit"
          aria-label="Find patient"
          className="h-12"
          disabled={busy || query.trim().length < 2}
        >
          <Search aria-hidden />
          <span className="hidden sm:inline">Find</span>
        </Button>
      </form>
      {patients && !patients.length && (
        <EmptyState
          illustration="patient-profile"
          title="No matching patients"
          description="Try another name, clinic number or contact detail."
        />
      )}
      {patients && patients.length > 0 && (
        <ul className="grid gap-3" aria-label="Patient search results">
          {patients.map((patient) => (
            <li key={patient.id}>
              <button
                type="button"
                className="flex min-h-20 w-full items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-teal-ink hover:bg-teal-soft focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                disabled={busy}
                onClick={() => void onSelect(patient)}
              >
                <div className="min-w-0">
                  <PersonIdentity kind="patient" name={patient.name} />
                  <p className="mt-2 text-xs text-muted-foreground">{patient.reference}</p>
                </div>
                <ArrowRight aria-hidden className="size-5 shrink-0 text-teal-ink" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {patients === null && (
        <p className="rounded-xl bg-muted p-5 text-sm leading-6 text-muted-foreground">
          Patient actions appear after you select a record. Confirm the patient’s identity before
          proceeding.
        </p>
      )}
    </section>
  );
}
