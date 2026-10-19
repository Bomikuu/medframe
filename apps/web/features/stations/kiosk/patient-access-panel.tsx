"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Info, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { ReceptionAssignment, type ReceptionKiosk } from "./reception-assignment";
import type { ManageAction } from "./staff-dialogs";
import { clinicTime } from "./types";

export type VerifiedPatient = { patient: string; verified: boolean };

export function PatientAccessPanel({
  kiosks,
  timezone,
  busy,
  run,
  selection,
  onSelectionChange,
}: {
  kiosks: ReceptionKiosk[];
  timezone: string;
  busy: boolean;
  run: ManageAction;
  selection: VerifiedPatient;
  onSelectionChange: (value: VerifiedPatient) => void;
}) {
  const { patient, verified } = selection;
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<{ id: string; name: string; reference: string }[]>([]);
  const [code, setCode] = useState<{ code: string; expires_at: string } | null>(null);
  const [searched, setSearched] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    if (!code) return;
    const timer = window.setTimeout(
      () => setCode(null),
      Math.max(0, new Date(code.expires_at).getTime() - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [code]);
  async function search() {
    onSelectionChange({ patient: "", verified: false });
    setCode(null);
    setPatients([]);
    setSearched(false);
    const result = (await run({ action: "patients", query })) as
      { patients: typeof patients } | undefined;
    if (result) {
      setPatients(result.patients);
      setSearched(true);
    }
  }
  return (
    <section
      aria-label="Patient verification"
      className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <h2 className="flex items-center gap-3 text-base font-semibold">
        <span className="bg-teal-wash flex size-10 items-center justify-center rounded-xl text-teal-ink">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        Patient kiosk access
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        Verify the patient’s identity, select their record and send it to an idle kiosk. The patient
        can complete multiple tasks without entering a code.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
        className="mt-4 flex items-end gap-2"
      >
        <div className="min-w-0 flex-1">
          <FormField id="kiosk-patient-search" label="Find patient by name or clinic reference">
            <Input
              id="kiosk-patient-search"
              type="search"
              placeholder="Search by name or clinic reference…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              minLength={2}
              maxLength={160}
              required
            />
          </FormField>
        </div>
        <Button type="submit" disabled={busy}>
          <Search className="size-4" aria-hidden="true" />
          <span>Find</span>
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs leading-5 text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Info className="size-3.5 shrink-0" aria-hidden="true" /> Reception opens the session; no
          patient code needed.
        </span>
        <button
          type="button"
          aria-expanded={showHelp}
          onClick={() => setShowHelp(!showHelp)}
          className="inline-flex min-h-8 items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
        >
          Learn more <ChevronDown className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      {showHelp && (
        <p className="mt-3 rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
          Verify identity in person, select the patient and an idle kiosk, then send the session.
          Strict-mode devices require a verification code before each task. Finish clears the
          patient session.
        </p>
      )}
      {searched && !patients.length && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          No matching patients. Check the name or clinic reference and try again.
        </p>
      )}
      {patients.length > 0 && (
        <div className="mt-4 grid max-w-xl gap-4">
          <FormSelect
            id="kiosk-patient"
            label="Patient record"
            value={patient}
            onChange={(value) => {
              onSelectionChange({ patient: value, verified: false });
              setCode(null);
            }}
            options={patients.map((item) => ({
              value: item.id,
              label: `${item.name} · ${item.reference}`,
            }))}
          />
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <Checkbox
              checked={verified}
              onCheckedChange={(value) => onSelectionChange({ patient, verified: value === true })}
            />
            I verified this patient’s identity in person.
          </label>
          <ReceptionAssignment
            kiosks={kiosks}
            patient={patient}
            verified={verified}
            busy={busy}
            run={run}
          />
          <details className="border-t border-border pt-4">
            <summary className="cursor-pointer text-sm font-semibold">
              Strict mode: patient verification code
            </summary>
            <Button
              type="button"
              variant="outline"
              className="mt-4 justify-self-start"
              disabled={!patient || !verified || busy}
              onClick={() =>
                void run({
                  action: "issue",
                  patient_id: patient,
                  method: "in_person_identity_verified",
                }).then((value) => {
                  if (value) setCode(value as { code: string; expires_at: string });
                })
              }
            >
              Generate strict-mode patient code
            </Button>
          </details>
        </div>
      )}
      {code && (
        <div className="bg-teal-wash mt-5 max-w-xl rounded-lg p-5 text-teal-ink" role="status">
          <p className="text-sm font-medium">Patient verification code</p>
          <p className="mt-3 text-2xl font-semibold tracking-[0.2em] select-all">{code.code}</p>
          <p className="mt-3 text-xs">
            Expires {clinicTime(code.expires_at, timezone)} · Show only to the verified patient.
          </p>
          <Button type="button" variant="ghost" onClick={() => setCode(null)} className="mt-3">
            Hide code
          </Button>
        </div>
      )}
    </section>
  );
}
