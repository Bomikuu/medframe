"use client";

import { Brand } from "@/components/brand";
import { RecoveryState } from "@/components/application/recovery-state";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { Plus, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { getGraphqlClient } from "@/lib/graphql/client";
import {
  PlatformCapabilitiesDocument,
  ClinicInvitationsDocument,
  InviteClinicDocument,
  ResendClinicInvitationDocument,
  RevokeClinicInvitationDocument,
} from "@/lib/graphql/generated";
import { z } from "zod";
import { message } from "@/features/onboarding/client";
import { InvitationLink } from "@/features/staff/staff-modals";
const rowSchema = z.object({
  id: z.string(),
  email: z.string(),
  contact_name: z.string(),
  clinic_name: z.string(),
  status: z.string(),
  created_at: z.string(),
  expires_at: z.string(),
  version: z.number(),
});
type Invitation = z.infer<typeof rowSchema>;
export function PlatformLink() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    getGraphqlClient()
      .request(PlatformCapabilitiesDocument, {})
      .then((result) =>
        setAllowed(
          (result.platformCapabilities as { clinic_invitations?: boolean }).clinic_invitations ===
            true,
        ),
      )
      .catch(() => {});
  }, []);
  return allowed ? (
    <Link
      href="/platform/clinic-invitations"
      className="text-sm font-medium text-primary underline underline-offset-4"
    >
      Clinic invitations
    </Link>
  ) : null;
}
export function ClinicInvitations() {
  const [allowed, setAllowed] = useState<boolean | null>(null),
    [items, setItems] = useState<Invitation[]>([]),
    [offset, setOffset] = useState(0),
    [status, setStatus] = useState(""),
    [more, setMore] = useState(false),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [action, setAction] = useState<{ item: Invitation; kind: "resend" | "revoke" } | null>(null),
    [refresh, setRefresh] = useState(0);
  const [link, setLink] = useState("");
  const form = useForm({
    defaultValues: { email: "", contact_name: "", clinic_name: "", hours: 168 },
  });
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const capability = await getGraphqlClient().request(PlatformCapabilitiesDocument, {});
        const permitted =
          (capability.platformCapabilities as { clinic_invitations?: boolean })
            .clinic_invitations === true;
        if (!active) return;
        setAllowed(permitted);
        if (!permitted) return;
        const result = await getGraphqlClient().request(ClinicInvitationsDocument, {
          offset,
          status,
        });
        const parsed = z
          .object({ items: z.array(rowSchema), has_more: z.boolean() })
          .parse(result.clinicInvitations);
        if (active) {
          setItems(parsed.items);
          setMore(parsed.has_more);
        }
      } catch (e) {
        if (active) {
          setAllowed(false);
          setError(message(e));
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [offset, status, refresh]);
  async function invite(values: {
    email: string;
    contact_name: string;
    clinic_name: string;
    hours: number;
  }) {
    setBusy(true);
    try {
      const result = await getGraphqlClient().request(InviteClinicDocument, {
        data: values,
        key: crypto.randomUUID(),
      });
      const created = z.object({ link: z.string().optional() }).parse(result.inviteClinic);
      setLink(created.link ?? "");
      setOpen(false);
      form.reset();
      setRefresh((value) => value + 1);
      toast.success("Clinic invitation queued for delivery.");
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function manage() {
    if (!action) return;
    setBusy(true);
    try {
      const result = await getGraphqlClient().request(
        action.kind === "resend" ? ResendClinicInvitationDocument : RevokeClinicInvitationDocument,
        { id: action.item.id, version: action.item.version },
      );
      if (action.kind === "resend" && "resendClinicInvitation" in result) {
        const replaced = z
          .object({ link: z.string().optional() })
          .parse(result.resendClinicInvitation);
        setLink(replaced.link ?? "");
      }
      toast.success(
        action.kind === "resend"
          ? "New invitation queued. Earlier links are invalid."
          : "Invitation revoked.",
      );
      setRefresh((value) => value + 1);
      setAction(null);
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <Link href="/clinic" className="flex items-center gap-2 font-semibold">
            <Brand />
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Platform administration
            </span>
          </Link>
          <Link href="/login" className="text-xs underline">
            Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="text-3xl font-semibold">Clinic invitations</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
              Invite a clinic into its own clinical workspace. Setup progress belongs to the
              verified recipient.
            </p>
          </div>
          {allowed && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus />
                  Invite clinic
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Invite a clinic</DialogTitle>
                <DialogDescription>
                  The recipient verifies their email before entering clinic details. Invitations are
                  queued through the configured mail service.
                </DialogDescription>
                <form onSubmit={form.handleSubmit(invite)} className="mt-3 grid gap-5">
                  <FormField id="invite-email" label="Contact email">
                    <Input
                      id="invite-email"
                      type="email"
                      autoComplete="email"
                      required
                      {...form.register("email", { required: true, maxLength: 320 })}
                    />
                  </FormField>
                  <FormField id="invite-contact" label="Contact name (optional)">
                    <Input id="invite-contact" maxLength={160} {...form.register("contact_name")} />
                  </FormField>
                  <FormField id="invite-clinic" label="Clinic name (optional)">
                    <Input id="invite-clinic" maxLength={160} {...form.register("clinic_name")} />
                  </FormField>
                  <div className="max-w-48">
                    <FormField
                      id="invite-hours"
                      label="Expires in (hours)"
                      hint="1–720 hours. Seven days is 168 hours."
                    >
                      <Input
                        id="invite-hours"
                        type="number"
                        min={1}
                        max={720}
                        {...form.register("hours", { valueAsNumber: true, min: 1, max: 720 })}
                      />
                    </FormField>
                  </div>
                  <Button disabled={busy} type="submit">
                    {busy ? "Queuing invitation…" : "Send invitation"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {allowed === null ? (
          <p role="status">Checking platform access…</p>
        ) : !allowed ? (
          <RecoveryState
            title={
              error
                ? "Clinic invitations are unavailable"
                : "Platform administrator access required"
            }
            description={
              error ||
              "Clinic administrator access does not include platform invitations. Ask a platform administrator to manage this invitation."
            }
          >
            {error && (
              <Button type="button" onClick={() => setRefresh((value) => value + 1)}>
                <RotateCcw aria-hidden="true" />
                Try again
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/auth/continue">
                Open my workspace
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </RecoveryState>
        ) : (
          <>
            <div className="mb-5 max-w-56">
              <FormSelect
                id="invitation-status"
                label="Invitation status"
                value={status || "all"}
                onChange={(value) => {
                  setStatus(value === "all" ? "" : value);
                  setOffset(0);
                }}
                options={[
                  "all",
                  "pending",
                  "opened",
                  "in_progress",
                  "completed",
                  "expired",
                  "revoked",
                ].map((value) => ({ value, label: value.replaceAll("_", " ") }))}
              />
            </div>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    {["Contact", "Clinic", "Status", "Sent", "Expires", "Actions"].map((label) => (
                      <TableHead key={label}>{label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length ? (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium">{item.contact_name || "Clinic contact"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.email}</p>
                        </TableCell>
                        <TableCell>{item.clinic_name || "Not provided"}</TableCell>
                        <TableCell>
                          <span className="rounded-md bg-muted px-2 py-1 text-xs capitalize">
                            {item.status.replaceAll("_", " ")}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(item.expires_at).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy || item.status === "completed"}
                              onClick={() => setAction({ item, kind: "resend" })}
                            >
                              Resend
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy || ["completed", "revoked"].includes(item.status)}
                              onClick={() => setAction({ item, kind: "revoke" })}
                            >
                              Revoke
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        No invitations match this view.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset((value) => Math.max(0, value - 25))}
              >
                <ArrowLeft />
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={!more}
                onClick={() => setOffset((value) => value + 25)}
              >
                Next
                <ArrowRight />
              </Button>
            </div>
          </>
        )}
      </main>
      <InvitationLink key={link} link={link} kind="clinic" onClose={() => setLink("")} />
      <AlertDialog
        open={!!action}
        onOpenChange={(value) => {
          if (!value) setAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            {action?.kind === "resend"
              ? "Replace this invitation link?"
              : "Revoke this invitation?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {action?.kind === "resend"
              ? "The earlier link and verification codes stop working. The recipient can resume their saved setup using the new invitation."
              : "The recipient will lose access to unfinished setup. Existing completed clinics are not changed."}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void manage();
              }}
            >
              {action?.kind === "resend" ? "Resend invitation" : "Revoke invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
