"use client";

import { PersonIdentity } from "@/components/application/person-identity";

import { ReasonField } from "@/components/application/reason-field";
import { reasonSuggestions } from "@/lib/reason-suggestions";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/application/phone-input";
import { phoneError } from "@/lib/contact-format";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { PatientRecordDocument, type PatientRowFragment } from "@/lib/graphql/generated";
import { PatientPicker } from "./patient-picker";

export type WalkInIdentity = {
  branch_id: string;
  patient_id: string | null;
  new_patient: Record<string, string> | null;
  reason: string;
};
export function WalkInDetails({
  initialPatient,
  busy,
  error,
  onClose,
  onSave,
}: {
  initialPatient?: PatientRowFragment;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (identity: WalkInIdentity) => void;
}) {
  const { organizationId, workspace, can, branchId: currentBranch } = useWorkspace();
  const [mode, setMode] = useState(initialPatient ? "existing" : "choose");
  const [patient, setPatient] = useState(initialPatient);
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [sex, setSex] = useState("not_recorded");
  const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState(currentBranch);
  const [reason, setReason] = useState("");
  const [verified, setVerified] = useState(false);
  const selected = useRemote(
    PatientRecordDocument,
    { organizationId, patientId: patient?.id ?? "" },
    { enabled: !!patient },
  );
  const branchId = mode === "existing" ? selected.data?.patientDemographics.branchId : branch;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="z-[160] max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle>Confirm patient & save consultation</DialogTitle>
        <DialogDescription>
          Your notes and findings are still in memory. Confirm who this care belongs to before
          creating the patient-linked clinical record. You can review and finalize it afterward.
        </DialogDescription>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (branchId && verified)
              onSave({
                branch_id: branchId,
                patient_id: mode === "existing" ? (patient?.id ?? null) : null,
                new_patient:
                  mode === "new" ? { full_name: name, date_of_birth: birth, sex, phone } : null,
                reason,
              });
          }}
          className="grid gap-5"
        >
          <fieldset disabled={busy} className="grid gap-5">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={mode !== "new" ? "secondary" : "outline"}
                onClick={() => {
                  setMode(patient ? "existing" : "choose");
                  setVerified(false);
                }}
              >
                Existing patient
              </Button>
              {can("patients.register") && (
                <Button
                  type="button"
                  variant={mode === "new" ? "secondary" : "outline"}
                  onClick={() => {
                    setMode("new");
                    setVerified(false);
                  }}
                >
                  New patient
                </Button>
              )}
            </div>
            {mode === "choose" && (
              <PatientPicker
                onSelect={(value) => {
                  setPatient(value);
                  setMode("existing");
                  setVerified(false);
                }}
              />
            )}
            {mode === "existing" && patient && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
                <div>
                  <p className="font-semibold">
                    <PersonIdentity kind="patient" name={patient.fullName} />
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {patient.reference} · {patient.dateOfBirth || "Birth date not recorded"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setMode("choose");
                    setVerified(false);
                  }}
                >
                  Choose another patient
                </Button>
              </div>
            )}
            {mode === "new" && (
              <div className="grid gap-4 border-t border-border pt-4">
                <FormField id="walkInName" label="Full name">
                  <Input
                    id="walkInName"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={160}
                    required
                  />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField id="walkInBirth" label="Date of birth (optional)">
                    <Input
                      id="walkInBirth"
                      type="date"
                      value={birth}
                      onChange={(event) => setBirth(event.target.value)}
                    />
                  </FormField>
                  <FormSelect
                    id="walkInSex"
                    label="Sex"
                    value={sex}
                    onChange={setSex}
                    options={[
                      { value: "not_recorded", label: "Not recorded" },
                      { value: "female", label: "Female" },
                      { value: "male", label: "Male" },
                      { value: "intersex", label: "Intersex" },
                    ]}
                  />
                  <FormField
                    id="walkInPhone"
                    label="Phone (optional)"
                    hint="Philippines: +63, without the leading 0."
                    error={phoneError(phone)}
                  >
                    <PhoneInput id="walkInPhone" value={phone} onValueChange={setPhone} />
                  </FormField>
                  <FormSelect
                    id="walkInBranch"
                    label="Registration branch"
                    value={branch}
                    onChange={setBranch}
                    options={workspace.branches.map((b) => ({ value: b.id, label: b.name }))}
                  />
                </div>
              </div>
            )}
            <ReasonField
              id="walkInReason"
              label="Reason for consultation"
              value={reason}
              onValueChange={setReason}
              suggestions={reasonSuggestions.visit}
              required
            />
            <label className="flex items-start gap-3 text-sm leading-6">
              <Checkbox
                className="mt-1"
                checked={verified}
                onCheckedChange={(value) => setVerified(value === true)}
              />
              I confirmed this patient’s identity and reviewed which record these notes will be
              saved to.
            </label>
          </fieldset>
          {!!selected.error && mode === "existing" && (
            <p role="alert" className="text-sm text-destructive">
              The selected patient record could not be loaded. Choose again.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error} Your clinical input remains in memory.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={
                busy ||
                !verified ||
                !branchId ||
                !reason.trim() ||
                mode === "choose" ||
                (mode === "new" && (!name.trim() || !!phoneError(phone)))
              }
            >
              {busy ? "Saving patient-linked care…" : "Save & open review"}
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Back to consultation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
