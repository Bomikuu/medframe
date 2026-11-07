"use client";

import { PlatformLink } from "@/features/platform/clinic-invitations";
import { useState } from "react";
import { UserPlus, Copy, RotateCcw, Ban, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { AccessRequired } from "@/components/application/access-required";
import { LoadingInformation } from "@/components/application/loading-information";
import { PageHeading, timeLabel } from "@/features/patients/feedback";
import { errorMessage } from "@/lib/auth/client";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { StaffDirectory } from "./staff-directory";
import { SetupReadiness } from "./setup-readiness";
import { ManageStaff, InviteStaff, InvitationLink } from "./staff-modals";
import { staffRequest, useStaff, roleLabel, type StaffMember, type StaffInvite } from "./client";
export { StaffDirectory } from "./staff-directory";

export function StaffPage() {
  const { organizationId, can, href } = useWorkspace();
  const remote = useStaff(organizationId, can("organization.manage"));
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [invite, setInvite] = useState(false);
  const [link, setLink] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!can("organization.manage"))
    return (
      <AccessRequired
        title="Staff administration access required"
        description="A clinic administrator manages team membership, doctor profiles and access."
      />
    );
  async function invitationAction(row: StaffInvite, action: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await staffRequest<{ link?: string }>({
        organization_id: organizationId,
        invitation_id: row.id,
        version: row.version,
        action,
      });
      if (result.link) setLink(result.link);
      if (action === "revoke")
        setNotice("Invitation revoked. Its old link and verification codes no longer work.");
      remote.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-6">
      <PageHeading
        title="Staff & Access"
        description="Your team, doctor profiles and the tools each person can use."
      >
        <ButtonLink variant="outline" href={href("/clinic/settings/schedules")}>
          Schedules
          <ArrowUpRight className="size-4" />
        </ButtonLink>
        <Button onClick={() => setInvite(true)} disabled={!remote.data}>
          <UserPlus className="size-4" />
          Invite staff
        </Button>
      </PageHeading>
      <PlatformLink />
      {notice && (
        <p role="status" className="rounded-lg bg-teal-soft p-4 text-sm text-teal-ink">
          {notice}
        </p>
      )}
      {(error || remote.error) && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <p className="flex-1">{error || remote.error}</p>
          <Button variant="outline" onClick={remote.reload}>
            Retry
          </Button>
        </div>
      )}
      {!remote.data ? (
        !remote.error && (
          <div className="grid min-h-96 place-items-center">
            <LoadingInformation
              title="Loading your clinic team"
              detail="Retrieving staff profiles, invitations and current access settings."
            />
          </div>
        )
      ) : (
        <>
          <SetupReadiness
            data={remote.data.readiness}
            deliveryHref={can("communications.manage") ? href("/clinic/communications") : undefined}
          />
          <StaffDirectory data={remote.data} onEdit={setEditing} />
          <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Staff invitations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Email verification, profile setup and MFA come before clinic access.
            </p>
            {!remote.data.invitations.length ? (
              <p className="py-8 text-sm text-muted-foreground">
                No invitations yet. Invite a team member to get started.
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-border">
                {remote.data.invitations.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium break-all">{row.email}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {row.branch} · {row.roles.map(roleLabel).join(", ")}
                        <br />
                        {row.state} · expires {timeLabel(row.expires_at)}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {row.state === "pending"
                          ? "Waiting for contact verification and account setup. Copy the same link to help them resume."
                          : row.state === "expired"
                            ? "Generate a replacement link. Saved profile details can be resumed after verification."
                            : row.state === "accepted"
                              ? "Membership activated. Manage access from their staff card."
                              : "This link no longer opens onboarding."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.state === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void invitationAction(row, "link")}
                        >
                          <Copy className="size-4" />
                          Invitation link
                        </Button>
                      )}
                      {["pending", "expired"].includes(row.state) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Generate a new invitation link? The previous link and email code will stop working.",
                              )
                            )
                              void invitationAction(row, "regenerate");
                          }}
                        >
                          <RotateCcw className="size-4" />
                          Regenerate
                        </Button>
                      )}
                      {row.state === "pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Revoke this invitation? It will no longer grant clinic access.",
                              )
                            )
                              void invitationAction(row, "revoke");
                          }}
                        >
                          <Ban className="size-4" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-5 text-sm leading-6 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-teal-ink" />
            <p>
              Workspace access controls tools. Patient records still require clinical permission and
              patient grants. Disabling a membership affects this clinic only; the person’s account,
              password and other clinics are preserved.
            </p>
          </div>
          {editing && (
            <ManageStaff
              key={editing.id}
              member={editing}
              data={remote.data}
              organizationId={organizationId}
              onClose={() => {
                setEditing(null);
                remote.reload();
              }}
              onSaved={() => {
                setEditing(null);
                setNotice("Staff profile and access saved.");
                remote.reload();
              }}
            />
          )}
          {invite && (
            <InviteStaff
              data={remote.data}
              organizationId={organizationId}
              onClose={() => setInvite(false)}
              onCreated={(value) => {
                setInvite(false);
                setLink(value);
                remote.reload();
              }}
            />
          )}
        </>
      )}
      <InvitationLink key={link} link={link} onClose={() => setLink("")} />
    </div>
  );
}
