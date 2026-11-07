"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Link2, LoaderCircle, RefreshCw, UserRoundPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { errorMessage } from "@/lib/auth/client";
import { OnboardingNotice } from "@/features/onboarding/onboarding-notice";
import {
  manageRegistration,
  reviewSchema,
  type RegistrationReview,
  type RegistrationRequest,
} from "./review-client";
import { RegistrationReviewDetail } from "./registration-review-detail";

export function PatientRegistrationReview({ onAccepted }: { onAccepted: () => void }) {
  const { organizationId, branchId, can } = useWorkspace();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserRoundPlus aria-hidden="true" />
          Registration requests
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Patient registration</DialogTitle>
          <DialogDescription>
            Share one clinic link. Patients verify their email and submit their details for review.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ReviewContent
            key={`${organizationId}:${branchId}`}
            organizationId={organizationId}
            branch={branchId}
            canCreate={can("patients.register")}
            onAccepted={onAccepted}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
function ReviewContent({
  organizationId,
  branch,
  canCreate,
  onAccepted,
}: {
  organizationId: string;
  branch: string;
  canCreate: boolean;
  onAccepted: () => void;
}) {
  const [data, setData] = useState<RegistrationReview | null>(null);
  const [selected, setSelected] = useState<RegistrationRequest | null>(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const reload = useCallback(async () => {
    if (!branch) return;
    setError("");
    try {
      setData(
        reviewSchema.parse(await manageRegistration(organizationId, branch, "list", { page })),
      );
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }, [organizationId, branch, page]);
  useEffect(() => {
    let current = true;
    setData(null);
    setSelected(null);
    setError("");
    if (branch)
      void manageRegistration(organizationId, branch, "list", { page })
        .then((value) => {
          if (current) setData(reviewSchema.parse(value));
        })
        .catch((failure) => {
          if (current) setError(errorMessage(failure));
        });
    return () => {
      current = false;
    };
  }, [organizationId, branch, page]);
  async function mutate(action: string, values: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await manageRegistration(organizationId, branch, action, values);
      await reload();
      return true;
    } catch (failure) {
      setError(errorMessage(failure));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function review(row: RegistrationRequest, decision: "accept" | "decline", patient: string) {
    const result = await mutate("review", {
      application_id: row.id,
      expected_version: row.version,
      decision,
      identity_verified: decision === "accept",
      patient_id: patient || undefined,
    });
    if (result) {
      setSelected(null);
      setNotice(
        decision === "accept"
          ? "Registration accepted. The portal invitation is queued for email delivery."
          : "Registration declined. No patient access was created.",
      );
      if (decision === "accept") onAccepted();
    }
  }
  return (
    <div className="space-y-5">
      {error && <OnboardingNotice tone="error">{error}</OnboardingNotice>}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-teal-50 p-4 text-sm leading-6 text-teal-900 dark:bg-teal-950 dark:text-teal-100"
        >
          {notice}
        </p>
      )}
      {!branch ? (
        <p className="text-sm text-muted-foreground">No permitted branch is available.</p>
      ) : !data ? (
        <div className="py-6 text-center">
          {error ? (
            <Button variant="outline" onClick={() => void reload()}>
              Try again
            </Button>
          ) : (
            <p role="status" className="flex justify-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Loading registration requests…
            </p>
          )}
        </div>
      ) : selected ? (
        <RegistrationReviewDetail
          key={selected.id}
          row={selected}
          busy={busy}
          canCreate={canCreate}
          onBack={() => setSelected(null)}
          onReview={review}
        />
      ) : (
        <>
          <section className="space-y-4 rounded-xl border p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Link2 className="size-4 text-teal-700" aria-hidden="true" />
              Patient registration link
            </h3>
            {data.link ? (
              <>
                <label className="flex items-center justify-between gap-4 text-sm">
                  <span>Accept new registration requests</span>
                  <Switch
                    checked={data.link.enabled}
                    disabled={busy}
                    onCheckedChange={(enabled) => void mutate("set_link", { enabled })}
                  />
                </label>
                <div className="flex min-w-0 items-center gap-2">
                  <Input
                    readOnly
                    value={data.link.url}
                    aria-label="Patient registration link"
                    className="min-w-0 flex-1 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Copy patient registration link"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(data.link!.url);
                        setCopied(true);
                      } catch {
                        setError(
                          "Could not copy automatically. Select and copy the registration link above.",
                        );
                      }
                    }}
                  >
                    {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  </Button>
                </div>
                <p role="status" className="text-xs leading-5 text-muted-foreground">
                  {copied
                    ? "Registration link copied."
                    : data.link.enabled
                      ? "Use this same link on your website, in messages or at reception. It grants no patient-record access."
                      : "Registration is paused. New verification and submissions are unavailable; existing requests can still be reviewed."}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm leading-6 text-muted-foreground">
                  Create a reusable link for this branch. Patients register themselves; you review
                  and accept their requests.
                </p>
                <Button disabled={busy} onClick={() => void mutate("create_link")}>
                  <Link2 aria-hidden="true" />
                  Create registration link
                </Button>
              </>
            )}
          </section>
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-semibold">
                Pending requests{" "}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  ({data.pending_count})
                </span>
              </h3>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => void reload()}>
                <RefreshCw aria-hidden="true" />
                Refresh
              </Button>
            </div>
            {data.requests.length ? (
              <ul className="divide-y rounded-xl border">
                {data.requests.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
                      onClick={() => setSelected(row)}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold break-words">
                          {row.full_name}
                        </span>
                        <span className="mt-1 block text-xs break-all text-muted-foreground">
                          {row.email} ·{" "}
                          {row.relationship === "guardian" ? "Guardian request" : "Patient request"}
                        </span>
                      </span>
                      <span className="text-xs font-medium text-teal-800 dark:text-teal-300">
                        Review request →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed px-5 py-8 text-center">
                <UserRoundPlus
                  className="mx-auto mb-3 size-7 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">No requests awaiting review</p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  Verified patient registrations from your branch link will appear here.
                </p>
              </div>
            )}
            {(page > 0 || data.has_more) && (
              <div className="mt-4 flex justify-between gap-3">
                <Button
                  variant="outline"
                  disabled={page === 0 || busy}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={!data.has_more || busy}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
