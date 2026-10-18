"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  PatientPortalAccessDocument,
  IssuePortalInvitationDocument,
  RevokePortalAccessDocument,
} from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { useSafety, useUnsavedChanges } from "@/features/workspace/safety-provider";
import { FormSelect } from "@/features/patients/form-controls";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { LoadState, failureText, timeLabel } from "@/features/patients/feedback";
import { recordPage } from "@/features/records/schema";
import { PageControls } from "@/features/records/record-filters";
const accessSchema = z.object({
  invitations: recordPage(
    z.object({
      id: z.string(),
      email: z.string(),
      relationship: z.string(),
      state: z.string(),
      expires_at: z.string(),
    }),
  ),
  links: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      display_name: z.string(),
      relationship: z.string(),
      active: z.boolean(),
      version: z.number(),
    }),
  ),
});
export function PatientPortalAccess({ patientId }: { patientId: string }) {
  const { organizationId } = useWorkspace();
  const [after, setAfter] = useState<string>();
  const remote = useRemote(PatientPortalAccessDocument, { organizationId, patientId, after });
  const parsed = accessSchema.safeParse(remote.data?.patientPortalAccess);
  const capture = useRequestScope();
  const { confirm } = useSafety();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const form = useForm({
    defaultValues: {
      email: "",
      relationship: "self",
      method: "in_person",
      note: "",
      attested: false,
      requestId: crypto.randomUUID(),
    },
  });
  const watchedForm = useWatch({ control: form.control });
  useUnsavedChanges(`portal-invite:${organizationId}:${patientId}`, form.formState.isDirty, () =>
    form.reset(),
  );
  async function revoke(identifier: string, kind: string, expectedVersion = 1) {
    if (
      !reason.trim() ||
      !(await confirm({
        title: "Revoke patient access?",
        description:
          "This connection or invitation will stop authorizing new requests. Give a reason before continuing.",
        action: "Revoke access",
      }))
    )
      return;
    const current = capture();
    setBusy(true);
    setError(null);
    try {
      await getGraphqlClient().request(RevokePortalAccessDocument, {
        organizationId,
        identifier,
        kind,
        expectedVersion,
        reason,
      });
      if (current()) {
        remote.reload();
        setMessage("Access revoked.");
        setReason("");
      }
    } catch (failure) {
      if (current()) setError(failure);
    } finally {
      if (current()) setBusy(false);
    }
  }
  return (
    <section className="grid gap-5 border-t border-border pt-6">
      <h2 className="text-xl font-semibold">Verified patient access</h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        Verify the person’s identity and guardian authority in clinic before inviting them. Contact
        details alone do not grant access.
      </p>
      <details className="rounded-lg border border-border p-5">
        <summary className="min-h-11 font-medium">Issue a verified invitation</summary>
        <form
          noValidate
          className="mt-4 grid max-w-2xl gap-4"
          onSubmit={form.handleSubmit(async (values) => {
            const current = capture();
            setError(null);
            setMessage("");
            try {
              await getGraphqlClient().request(IssuePortalInvitationDocument, {
                organizationId,
                patientId,
                requestId: values.requestId,
                data: {
                  email: values.email,
                  relationship: values.relationship,
                  method: values.method,
                  note: values.note,
                  attested: values.attested,
                },
              });
              if (current()) {
                form.reset({
                  ...values,
                  note: "",
                  attested: false,
                  requestId: crypto.randomUUID(),
                });
                setMessage("Invitation queued for delivery. It expires after 24 hours.");
                remote.reload();
              }
            } catch (failure) {
              if (current()) setError(failure);
            }
          })}
        >
          <FormField
            id="portal-email"
            label="Verified account email"
            error={form.formState.errors.email?.message}
          >
            <Input
              id="portal-email"
              type="email"
              autoComplete="off"
              maxLength={320}
              {...form.register("email", { required: "Enter the verified email address." })}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              id="portal-relationship"
              label="Relationship"
              value={watchedForm.relationship ?? ""}
              onChange={(value) => {
                form.setValue("relationship", value, { shouldDirty: true });
                form.setValue(
                  "method",
                  value === "guardian" ? "verified_guardian_authority" : "in_person",
                  { shouldDirty: true },
                );
              }}
              options={[
                { value: "self", label: "Patient (self)" },
                { value: "guardian", label: "Verified guardian" },
              ]}
            />
            <FormSelect
              id="portal-verification"
              label="Verification method"
              value={watchedForm.method ?? ""}
              onChange={(value) => form.setValue("method", value, { shouldDirty: true })}
              options={
                watchedForm.relationship === "guardian"
                  ? [
                      {
                        value: "verified_guardian_authority",
                        label: "Guardian identity and authority verified",
                      },
                    ]
                  : [
                      { value: "in_person", label: "In-person identity verification" },
                      {
                        value: "clinic_verified_existing_identity",
                        label: "Clinic-verified existing identity",
                      },
                    ]
              }
            />
          </div>
          <FormField
            id="verification-note"
            label="Verification note (optional)"
            hint="Do not enter identity document numbers or upload identity documents."
          >
            <Input id="verification-note" maxLength={240} {...form.register("note")} />
          </FormField>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <Checkbox
              checked={watchedForm.attested}
              onCheckedChange={(value) =>
                form.setValue("attested", value === true, { shouldDirty: true })
              }
            />
            I verified this person’s identity and their authority for this relationship.
          </label>
          <Button
            className="justify-self-start"
            disabled={form.formState.isSubmitting || !watchedForm.attested}
          >
            Send verified invitation
          </Button>
        </form>
      </details>
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : parsed.success ? (
        <>
          <ul className="grid gap-4">
            {parsed.data.links.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"
              >
                <div>
                  <p>
                    {item.display_name || item.email} · {item.relationship}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.active ? "Active connection" : "Revoked connection"}
                  </p>
                </div>
                {item.active && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || !reason.trim()}
                    onClick={() => void revoke(item.id, "link", item.version)}
                  >
                    Revoke connection
                  </Button>
                )}
              </li>
            ))}
            {parsed.data.invitations.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"
              >
                <div>
                  <p>
                    {item.email} · {item.relationship}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.state} · expires {timeLabel(item.expires_at)}
                  </p>
                </div>
                {item.state === "pending" && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || !reason.trim()}
                    onClick={() => void revoke(item.id, "invitation")}
                  >
                    Revoke invitation
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <PageControls
            after={after}
            next={parsed.data.invitations.end_cursor}
            onChange={setAfter}
          />
        </>
      ) : (
        <p role="alert">Patient access could not be read.</p>
      )}
      <FormField id="revoke-reason" label="Reason for revocation">
        <Input
          id="revoke-reason"
          maxLength={240}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </FormField>
      {error !== null && <p role="alert">{failureText(error)}</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
