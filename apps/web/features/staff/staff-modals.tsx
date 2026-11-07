"use client";
import { useState } from "react";
import { Copy, Save, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PhoneInput } from "@/components/application/phone-input";
import { FormField } from "@/components/form-field";
import { useReturnFocus } from "@/components/application/use-step-focus";
import { errorMessage } from "@/lib/auth/client";
import { StaffAccessFields } from "./access-fields";
import { StaffPhotoControl } from "./staff-photo";
import { staffRequest, type AccessSettings, type StaffSnapshot, type StaffMember } from "./client";

export function ManageStaff({
  member,
  data,
  organizationId,
  onClose,
  onSaved,
}: {
  member: StaffMember;
  data: StaffSnapshot;
  organizationId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  useReturnFocus();
  const [draft, setDraft] = useState({ ...member, display_name: member.name, remove_photo: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage {member.name}</DialogTitle>
          <DialogDescription>
            Update the clinic profile, doctor assignment and permitted tools.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-6"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              await staffRequest({
                organization_id: organizationId,
                action: "update",
                membership_id: member.id,
                ...draft,
              });
              onSaved();
            } catch (cause) {
              setError(errorMessage(cause));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid items-start gap-6 sm:grid-cols-[200px_1fr]">
            <StaffPhotoControl
              name={draft.display_name}
              photoId={draft.photo_id}
              disabled={busy}
              fields={{
                organization_id: organizationId,
                membership_id: member.id,
                version: String(draft.version),
              }}
              onUploaded={(photo) =>
                setDraft((value) => ({
                  ...value,
                  photo_id: photo.photo_id,
                  version: photo.version ?? value.version,
                  remove_photo: false,
                }))
              }
              onRemove={() => setDraft({ ...draft, photo_id: null, remove_photo: true })}
            />
            <div className="grid gap-4">
              <FormField id="staff-name" label="Display name">
                <Input
                  id="staff-name"
                  required
                  maxLength={160}
                  value={draft.display_name}
                  onChange={(event) => setDraft({ ...draft, display_name: event.target.value })}
                />
              </FormField>
              <FormField id="staff-email" label="Account email">
                <Input id="staff-email" value={member.email} disabled />
              </FormField>
              <FormField id="staff-phone" label="Phone number (optional)">
                <PhoneInput
                  id="staff-phone"
                  value={draft.phone}
                  onValueChange={(phone) => setDraft({ ...draft, phone })}
                />
              </FormField>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Active clinic membership</span>
                <Switch
                  aria-label="Active clinic membership"
                  disabled={busy || member.id === data.actor_id}
                  checked={draft.active}
                  onCheckedChange={(active) => setDraft({ ...draft, active })}
                />
              </label>
            </div>
          </div>
          {member.id === data.actor_id && (
            <p className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
              You can update your profile. Another clinic administrator must change your own role,
              branch, workspace or billing access.
            </p>
          )}
          <StaffAccessFields
            value={draft}
            onChange={(settings) => setDraft({ ...draft, ...settings })}
            choices={data}
            disabled={busy || member.id === data.actor_id}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            Uploaded photos save immediately after scanning. Other changes apply when you save.
            Existing account credentials, MFA and patient grants are retained.
          </p>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Close
            </Button>
            <Button type="submit" disabled={busy}>
              <Save className="size-4" />
              {busy ? "Saving…" : "Save staff changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InviteStaff({
  data,
  organizationId,
  onClose,
  onCreated,
}: {
  data: StaffSnapshot;
  organizationId: string;
  onClose: () => void;
  onCreated: (link: string) => void;
}) {
  useReturnFocus();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<AccessSettings>({
    roles: ["doctor"],
    branch_id: data.branches[0]?.id ?? null,
    workspace_mode: "full",
    billing_access: "inherit",
    specialty:
      data.specialties.find((s) => s.code === "general_medicine")?.code ??
      data.specialties[0]?.code ??
      "",
    professional_title: "",
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>
            Choose their clinic access. They verify their email, add their profile and set up MFA
            before joining.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-6"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              const result = await staffRequest<{ link: string }>({
                organization_id: organizationId,
                action: "invite",
                email,
                ...settings,
              });
              onCreated(result.link);
            } catch (cause) {
              setError(errorMessage(cause));
            } finally {
              setBusy(false);
            }
          }}
        >
          <FormField id="invite-email" label="Staff email">
            <Input
              id="invite-email"
              required
              type="email"
              autoComplete="email"
              maxLength={320}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@clinic.com"
            />
          </FormField>
          <StaffAccessFields
            value={settings}
            onChange={setSettings}
            choices={data}
            disabled={busy}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            Invitations last 3 days. After creating one, copy its link even if email delivery is
            unavailable. Queued email is not confirmation of delivery. Existing memberships are
            managed from their staff card.
          </p>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !settings.roles.length}>
              <UserPlus className="size-4" />
              {busy ? "Creating invitation…" : "Create invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InvitationLink({
  link,
  onClose,
  kind = "staff",
}: {
  link: string;
  onClose: () => void;
  kind?: "staff" | "clinic";
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog
      open={!!link}
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false);
          setError("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {kind === "clinic" ? "Clinic setup link" : "Staff onboarding link"}
          </DialogTitle>
          <DialogDescription>
            {kind === "clinic"
              ? "The invited contact verifies their email before resuming clinic setup."
              : "The invited person verifies their email before setting up their profile and secure account."}{" "}
            Share this link directly with the intended recipient if email is unavailable.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={link}
          readOnly
          aria-label={kind === "clinic" ? "Clinic setup link" : "Staff onboarding link"}
          onFocus={(event) => event.target.select()}
        />
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            } catch {
              setError("Select the link and copy it manually.");
            }
          }}
        >
          <Copy className="size-4" />
          {copied ? "Link copied" : "Copy invitation link"}
        </Button>
        <p role="status" className="text-xs leading-6 text-muted-foreground">
          {copied
            ? "Invitation link copied to your clipboard."
            : "This link does not activate access. Contact verification and account setup are still required."}
        </p>
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
        {error && (
          <p role="status" className="text-sm text-muted-foreground">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
