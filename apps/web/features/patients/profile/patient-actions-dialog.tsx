"use client";

import { useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  FileText,
  History,
  ImagePlus,
  ListChecks,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserPen,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntryFormActions } from "@/components/application/entry-sheet";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety } from "@/features/workspace/safety-provider";
import type { PatientDetailsFragment } from "@/lib/graphql/generated";
import { ClinicalHistorySection } from "../clinical-history-form";
import { ConsultationList } from "@/features/consultations/consultation-pages";
import { TreatmentPlans } from "@/features/treatments/treatment-plans";
import { DiagnosticList } from "@/features/diagnostics/request-list";
import { DocumentPanel } from "@/features/documents/document-panel";
import { PatientServices } from "@/features/services/patient-services";
import { PatientBilling } from "@/features/billing/patient-billing";
import { PatientPortalAccess } from "@/features/portal/access/patient-portal-access";
import { PatientAccess } from "../patient-access";
import { StaffReleases } from "@/features/portal/staff-releases";
import { ReportReview } from "@/features/portal/report-review";
import { PatientPhotoDialog } from "./patient-photo-dialog";
import { PatientAppointmentAction } from "./patient-appointment-action";
import { PatientPaymentAction } from "./patient-payment-action";
import { cn } from "@/lib/utils";

type ActionId =
  | "consultation"
  | "continue-consultation"
  | "edit"
  | "history"
  | "medical"
  | "book"
  | "reschedule"
  | "check-in"
  | "walk-in"
  | "payment"
  | "invoices"
  | "services"
  | "treatments"
  | "diagnostics"
  | "documents"
  | "sharing"
  | "portal"
  | "access"
  | "photo"
  | "remove-photo";
type Action = {
  id: ActionId;
  label: string;
  description: string;
  group: string;
  icon: LucideIcon;
  visible: boolean;
  tone?: "care" | "finance" | "record";
  href?: string;
};

export function PatientActionsDialog({
  patient,
  portraitId,
  open,
  onOpenChange,
  returnFocus,
  updated,
}: {
  patient: PatientDetailsFragment;
  portraitId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
  updated: () => void;
}) {
  const { can, href } = useWorkspace();
  const { guard, clearDirty } = useSafety();
  const router = useRouter();
  const [active, setActive] = useState<ActionId | null>(null);
  const [search, setSearch] = useState("");
  const [photo, setPhoto] = useState<"edit" | "remove" | null>(null);
  const openingPhoto = useRef(false);
  const clinical = can("patients.clinical.read");
  const editPhoto = clinical && can("patients.clinical.write") && can("documents.write");
  const actions: Action[] = [
    {
      id: "continue-consultation",
      label: "Continue consultation",
      description: "Choose an existing consultation for this patient",
      group: "Clinical care",
      icon: Stethoscope,
      visible: clinical && can("encounters.write"),
      tone: "care",
    },
    {
      id: "consultation",
      label: "Start consultation",
      description: "Open a new visit for this patient",
      group: "Clinical care",
      icon: Stethoscope,
      visible: clinical && can("encounters.write"),
      tone: "care",
      href: `${href("/clinic/consultations/new")}&patient=${patient.id}`,
    },
    {
      id: "medical",
      label: "Update medical history",
      description: "Review allergies, medication and history",
      group: "Clinical care",
      icon: ClipboardCheck,
      visible: clinical && can("patients.clinical.write"),
      tone: "care",
    },
    {
      id: "treatments",
      label: "Treatment & follow-ups",
      description: "Create plans and update care progress",
      group: "Clinical care",
      icon: ListChecks,
      visible: clinical && can("treatments.write"),
      tone: "care",
    },
    {
      id: "diagnostics",
      label: "Request diagnostics",
      description: "Create or manage examination requests",
      group: "Clinical care",
      icon: ScanLine,
      visible: clinical && can("diagnostics.read") && can("diagnostics.request"),
      tone: "care",
    },
    {
      id: "book",
      label: "Book appointment",
      description: "Choose a provider and available time",
      group: "Visits & payments",
      icon: CalendarDays,
      visible: can("operations.read") && can("appointments.manage"),
    },
    {
      id: "reschedule",
      label: "Reschedule appointment",
      description: "Choose an existing booked appointment",
      group: "Visits & payments",
      icon: CalendarClock,
      visible: can("operations.read") && can("appointments.manage"),
    },
    {
      id: "check-in",
      label: "Check in patient",
      description: "Confirm arrival for a booked appointment",
      group: "Visits & payments",
      icon: ClipboardCheck,
      visible: can("operations.read") && can("queues.manage"),
    },
    {
      id: "walk-in",
      label: "Add walk-in",
      description: "Admit this patient to the consultation queue",
      group: "Visits & payments",
      icon: UserPlus,
      visible: can("operations.read") && can("queues.manage"),
    },
    {
      id: "payment",
      label: "Record payment",
      description: "Select an invoice and record money received",
      group: "Visits & payments",
      icon: CreditCard,
      visible: can("billing.read") && can("payments.record"),
      tone: "finance",
    },
    {
      id: "invoices",
      label: "Invoices & adjustments",
      description: "Create charges and manage existing invoices",
      group: "Visits & payments",
      icon: Wallet,
      visible: can("billing.read") && (can("billing.manage") || can("payments.record")),
      tone: "finance",
    },
    {
      id: "services",
      label: can("services.work") ? "Services & payment plans" : "View patient services",
      description: can("services.work")
        ? "Start a service and manage its agreement"
        : "Review this patient’s service workflows",
      group: "Visits & payments",
      icon: ListChecks,
      visible: can("services.read"),
      tone: "finance",
    },
    {
      id: "edit",
      label: "Edit patient details",
      description: "Update identity and contact information",
      group: "Patient record",
      icon: UserPen,
      visible: can("patients.demographics.write"),
      href: href(`/clinic/patients/${patient.id}/edit`),
    },
    {
      id: "documents",
      label: "Upload documents",
      description: "Add protected files or new versions",
      group: "Patient record",
      icon: FileText,
      visible: clinical && can("documents.write"),
    },
    {
      id: "photo",
      label: portraitId ? "Change patient photo" : "Upload patient photo",
      description: "Choose a circular profile photo",
      group: "Patient record",
      icon: ImagePlus,
      visible: editPhoto,
    },
    {
      id: "remove-photo",
      label: "Remove patient photo",
      description: "Keep the original file in the patient record",
      group: "Patient record",
      icon: Trash2,
      visible: editPhoto && !!portraitId,
    },
    {
      id: "sharing",
      label: "Shared records & reports",
      description: "Review submissions and manage patient releases",
      group: "Patient record",
      icon: FileText,
      visible: clinical && can("patients.clinical.write"),
    },
    {
      id: "portal",
      label: "Patient portal access",
      description: "Issue verified invitations or revoke access",
      group: "Patient record",
      icon: ShieldCheck,
      visible: can("portal.manage"),
    },
    {
      id: "access",
      label: "Clinical assignments",
      description: "Grant or revoke eligible clinicians’ access",
      group: "Patient record",
      icon: Users,
      visible: can("patients.access.manage"),
    },
    {
      id: "history",
      label: "Patient record timeline",
      description: "Review attributed record and visit history",
      group: "Patient record",
      icon: History,
      visible: true,
      href: href(`/clinic/patients/${patient.id}/history`),
    },
  ].filter((action) => action.visible) as Action[];
  const current = actions.find((action) => action.id === active);
  const identity = { id: patient.id, name: patient.fullName, reference: patient.reference };

  function dismiss() {
    void guard(() => {
      setActive(null);
      setSearch("");
      onOpenChange(false);
      updated();
    });
  }
  function choose(action: Action) {
    void guard(() => {
      if (action.href) {
        onOpenChange(false);
        router.push(action.href);
        return;
      }
      if (action.id === "photo" || action.id === "remove-photo") {
        openingPhoto.current = true;
        onOpenChange(false);
        setPhoto(action.id === "photo" ? "edit" : "remove");
        return;
      }
      setActive(action.id);
    });
  }
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) dismiss();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-4xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (openingPhoto.current) {
              openingPhoto.current = false;
              return;
            }
            returnFocus.current?.focus();
          }}
        >
          <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card p-5 pr-14 sm:p-6 sm:pr-14">
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close"
                className="absolute top-3 right-3"
              >
                <X aria-hidden className="size-4" />
              </Button>
            </DialogClose>
            <DialogTitle className="text-xl font-semibold">Patient actions</DialogTitle>
            <DialogDescription className="wrap-anywhere">
              {patient.fullName} · {patient.reference}
            </DialogDescription>
          </DialogHeader>
          <div className="@container grid min-w-0 gap-5 p-5 sm:p-6">
            {active ? (
              <>
                <Button
                  variant="ghost"
                  className="w-fit px-0 text-teal-ink"
                  onClick={() =>
                    void guard(() => {
                      setActive(null);
                      updated();
                    })
                  }
                >
                  <ArrowLeft aria-hidden className="size-4" />
                  All patient actions
                </Button>
                <h2 className="text-lg font-semibold">{current?.label ?? "Action unavailable"}</h2>
                <EntryFormActions
                  cancel={() =>
                    void guard(() => {
                      setActive(null);
                      updated();
                    })
                  }
                  complete={() => {
                    clearDirty();
                    setActive(null);
                    updated();
                    toast.success("Changes saved.");
                  }}
                >
                  {!current ? (
                    <p role="alert">Your access to this action has changed.</p>
                  ) : (
                    <>
                      {active === "continue-consultation" && (
                        <ConsultationList patientId={patient.id} />
                      )}
                      {active === "medical" && <ClinicalHistorySection patientId={patient.id} />}
                      {active === "treatments" && <TreatmentPlans patientId={patient.id} />}
                      {active === "diagnostics" && <DiagnosticList patientId={patient.id} />}
                      {active === "documents" && <DocumentPanel patientId={patient.id} />}
                      {active === "services" && (
                        <PatientServices patientId={patient.id} branchId={patient.branchId} />
                      )}
                      {active === "invoices" && (
                        <PatientBilling patientId={patient.id} branchId={patient.branchId} />
                      )}
                      {active === "payment" && (
                        <PatientPaymentAction
                          patientId={patient.id}
                          branchId={patient.branchId}
                          updated={updated}
                        />
                      )}
                      {(active === "book" ||
                        active === "reschedule" ||
                        active === "check-in" ||
                        active === "walk-in") && (
                        <PatientAppointmentAction
                          patient={identity}
                          branchId={patient.branchId}
                          mode={active}
                          updated={updated}
                        />
                      )}
                      {active === "portal" && <PatientPortalAccess patientId={patient.id} />}
                      {active === "access" && <PatientAccess patientId={patient.id} />}
                      {active === "sharing" && (
                        <>
                          <StaffReleases patientId={patient.id} />
                          <ReportReview patientId={patient.id} />
                        </>
                      )}
                    </>
                  )}
                </EntryFormActions>
              </>
            ) : (
              <>
                <Input
                  type="search"
                  aria-label="Search patient actions"
                  placeholder="Find an action…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {["Clinical care", "Visits & payments", "Patient record"].map((group) => {
                  const items = actions.filter(
                    (action) =>
                      action.group === group &&
                      `${action.label} ${action.description}`
                        .toLowerCase()
                        .includes(search.toLowerCase().trim()),
                  );
                  if (!items.length) return null;
                  return (
                    <section key={group} className="grid gap-3">
                      <h2 className="text-sm font-semibold">{group}</h2>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            onClick={() => choose(action)}
                            className={cn(
                              "group flex min-h-28 items-start gap-3 rounded-xl border border-border p-4 text-left outline-offset-4 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring",
                              action.id === "consultation" &&
                                "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
                            )}
                          >
                            <span
                              className={cn(
                                "grid size-9 shrink-0 place-items-center rounded-lg",
                                action.id === "consultation"
                                  ? "bg-primary-foreground/10"
                                  : action.tone === "finance"
                                    ? "bg-warning-soft text-warning"
                                    : action.tone === "care"
                                      ? "bg-teal-soft text-teal-ink"
                                      : "bg-info-soft text-info",
                              )}
                            >
                              <action.icon aria-hidden className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-2 text-sm font-semibold">
                                {action.label}
                                {action.href && (
                                  <ArrowUpRight aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                                )}
                              </span>
                              <span
                                className={cn(
                                  "mt-1 block text-xs leading-5",
                                  action.id === "consultation"
                                    ? "text-primary-foreground/85"
                                    : "text-muted-foreground",
                                )}
                              >
                                {action.description}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}
                {!actions.some((action) =>
                  `${action.label} ${action.description}`
                    .toLowerCase()
                    .includes(search.toLowerCase().trim()),
                ) && (
                  <p role="status" className="py-6 text-sm text-muted-foreground">
                    No actions match your search.
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {photo && (
        <PatientPhotoDialog
          key={`${patient.id}:${photo}`}
          patient={{
            patient_id: patient.id,
            patient: patient.fullName,
            reference: patient.reference,
            portrait_id: portraitId ?? null,
          }}
          intent={photo}
          onClose={() => setPhoto(null)}
          onSaved={updated}
          onReturnFocus={() => returnFocus.current?.focus()}
        />
      )}
    </>
  );
}
