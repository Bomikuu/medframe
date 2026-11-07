"use client";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { type AccessSettings, type StaffSnapshot, roleLabel } from "./client";
import { StaffAccessSummary, accessPermissions } from "./access-summary";

const descriptions: Record<string, string> = {
  clinic_administrator:
    "Clinic settings and team administration. Patient records still require grants.",
  doctor: "Medical consultations and records for assigned patients.",
  dentist: "Dental consultations and records for assigned patients.",
  nurse: "Permitted patient records and clinical support.",
  receptionist: "Patient directory, bookings and queue coordination.",
};
export function StaffAccessFields({
  value,
  onChange,
  choices,
  disabled = false,
}: {
  value: AccessSettings;
  onChange: (value: AccessSettings) => void;
  choices: Pick<
    StaffSnapshot,
    "roles" | "branches" | "branch_restricted" | "specialties" | "role_permissions"
  >;
  disabled?: boolean;
}) {
  const clinical = value.roles.some((role) => ["doctor", "dentist"].includes(role));
  return (
    <div className="grid gap-6">
      <fieldset disabled={disabled} className="grid gap-3">
        <legend className="mb-3 text-sm font-semibold">Clinic roles</legend>
        {choices.roles.map((role) => (
          <label
            key={role}
            className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border p-3"
          >
            <span>
              <span className="block text-sm font-medium">{roleLabel(role)}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {descriptions[role]}
              </span>
            </span>
            <Switch
              aria-label={`${roleLabel(role)} role`}
              checked={value.roles.includes(role)}
              onCheckedChange={(checked) =>
                onChange({
                  ...value,
                  roles: checked ? [...value.roles, role] : value.roles.filter((r) => r !== role),
                })
              }
            />
          </label>
        ))}
      </fieldset>
      <FormSelect
        id="staff-branch"
        label="Assigned branch"
        value={value.branch_id ?? "all"}
        disabled={disabled}
        onChange={(id) => onChange({ ...value, branch_id: id === "all" ? null : id })}
        options={[
          ...(!choices.branch_restricted
            ? [{ value: "all", label: "All permitted branches" }]
            : []),
          ...choices.branches.map((b) => ({ value: b.id, label: b.name })),
        ]}
      />
      <section className="grid gap-4 border-t border-border pt-5">
        <h3 className="text-sm font-semibold">Workspace & billing access</h3>
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">Approved Stations only</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              On: regular clinic pages are blocked. An approved Clinical Station in the assigned
              branch is required. Off: all tools permitted by the selected roles.
            </span>
          </span>
          <Switch
            aria-label="Approved Stations only"
            disabled={disabled}
            checked={value.workspace_mode === "station"}
            onCheckedChange={(checked) =>
              onChange({ ...value, workspace_mode: checked ? "station" : "full" })
            }
          />
        </label>
        <FormSelect
          id="staff-billing"
          label="Billing access"
          value={value.billing_access}
          disabled={disabled}
          onChange={(billing) =>
            onChange({ ...value, billing_access: billing as AccessSettings["billing_access"] })
          }
          options={[
            { value: "inherit", label: "Use role defaults" },
            { value: "none", label: "No billing access" },
            { value: "view", label: "View bills only" },
            { value: "record", label: "View bills & record payments" },
            { value: "manage", label: "Manage billing & record payments" },
          ]}
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Billing does not grant clinical records. Refund/adjustment powers remain limited to roles
          that already hold them. Station device permissions also apply.
        </p>
      </section>
      {clinical && (
        <section className="grid gap-4 border-t border-border pt-5">
          <h3 className="text-sm font-semibold">Doctor profile</h3>
          <FormField id="staff-title" label="Professional title">
            <Input
              id="staff-title"
              value={value.professional_title}
              maxLength={120}
              disabled={disabled}
              placeholder="For example, General Dentist"
              onChange={(event) => onChange({ ...value, professional_title: event.target.value })}
            />
          </FormField>
          <FormSelect
            id="staff-specialty"
            label="Specialization"
            value={value.specialty}
            disabled={disabled}
            onChange={(specialty) => onChange({ ...value, specialty })}
            options={[
              { value: "", label: "Choose a specialization" },
              ...choices.specialties.map((s) => ({ value: s.code, label: s.name })),
              ...(value.specialty && !choices.specialties.some((s) => s.code === value.specialty)
                ? [
                    {
                      value: value.specialty,
                      label: `${value.specialty.replaceAll("_", " ")} (current)`,
                    },
                  ]
                : []),
            ]}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            This creates or updates the provider profile used in consultations. Appointment hours
            and resources are configured in Schedules. Credential verification is not changed.
          </p>
        </section>
      )}
      <StaffAccessSummary
        value={value}
        branch={
          value.branch_id
            ? (choices.branches.find((branch) => branch.id === value.branch_id)?.name ??
              "Assigned branch")
            : value.workspace_mode === "station"
              ? "Select a branch for Station-only access"
              : "All permitted branches"
        }
        permissions={accessPermissions(value, choices.role_permissions)}
      />
    </div>
  );
}
