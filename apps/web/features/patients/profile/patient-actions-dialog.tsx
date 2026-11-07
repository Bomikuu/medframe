"use client";

import { RecordUnavailable } from "@/components/application/record-unavailable";

import { useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ArrowLeft,
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
import { PatientRecordBrowse } from "./patient-record-browse";
import { useStationDetails } from "@/features/stations/access-session";
import { StationConsultations } from "@/features/stations/station-consultations";
import { DiagnosticRequestDetail } from "@/features/diagnostics/request-detail";
import { STATION_PATIENT_ACTIONS } from "./station-action-scope";
import { PatientActionGrid } from "./patient-action-grid";
import type { ProfileSummary } from "./summary";
import { localDate } from "@/features/operations/schema";
import { calendarDay } from "@/features/operations/calendar-dates";

export type ActionId =
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
  station = false,
  initialAction = null,
  navigate,
  summary,
}: {
  patient: PatientDetailsFragment;
  portraitId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
  updated: () => void;
  station?: boolean;
  initialAction?: ActionId | null;
  navigate?: (href: string, close: () => void) => void;
  summary?: ProfileSummary | null;
}) {
  const { can, href } = useWorkspace();
  const stationDetails = useStationDetails();
  const stationPayment =
    !station ||
    (!!stationDetails?.doctor_profile &&
      (!stationDetails.device ||
        ["billing.read", "payments.record"].every((key) =>
          stationDetails.device!.functions.includes(key),
        )));
  const [diagnosticId, setDiagnosticId] = useState<string | null>(null);
  const { guard, clearDirty } = useSafety();
  const router = useRouter();
  const [active, setActive] = useState<ActionId | null>(initialAction);
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
      href: `${href(station ? "/station/clinician/walk-in" : "/clinic/consultations/new")}&patient=${patient.id}`,
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
      visible: can("billing.read") && can("payments.record") && stationPayment,
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
      label: station
        ? "Service progress"
        : can("services.work")
          ? "Services & payment plans"
          : "View patient services",
      description: station
        ? "Review service stages without editing the agreement"
        : can("services.work")
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
      description: "Upload a photo to update the patient’s profile",
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
  ].filter(
    (action) => action.visible && (!station || STATION_PATIENT_ACTIONS.has(action.id)),
  ) as Action[];
  const current = actions.find((action) => action.id === active);
  const hasOpenVisit = summary?.clinical?.recent.some((visit) =>
    ["draft", "in_progress", "completed"].includes(visit.status),
  );
  const hasTodayBooking = summary?.operations?.upcoming.some(
    (booking) =>
      booking.status === "booked" &&
      calendarDay(booking.start, summary.timezone) === localDate(summary.timezone),
  );
  const hasBalance = summary?.financial?.balances.some(
    (balance) => Number(balance.outstanding) > 0,
  );
  const suggested = [
    ...(hasOpenVisit ? ["continue-consultation"] : []),
    ...(hasTodayBooking ? ["check-in"] : []),
    ...(hasBalance ? ["payment"] : []),
    "consultation",
    "book",
    "medical",
    "history",
  ]
    .filter((id) => actions.some((action) => action.id === id))
    .slice(0, 3);
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
        if (navigate) navigate(action.href, () => onOpenChange(false));
        else {
          onOpenChange(false);
          router.push(action.href);
        }
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
                    <RecordUnavailable
                      title="This action is unavailable"
                      description="Your access to this action has changed. Choose another permitted action or contact your clinic administrator."
                    />
                  ) : (
                    <>
                      {active === "continue-consultation" &&
                        (station ? (
                          <StationConsultations patientId={patient.id} />
                        ) : (
                          <ConsultationList patientId={patient.id} />
                        ))}
                      {active === "medical" && <ClinicalHistorySection patientId={patient.id} />}
                      {active === "treatments" && <TreatmentPlans patientId={patient.id} />}
                      {active === "diagnostics" &&
                        (station && diagnosticId ? (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => void guard(() => setDiagnosticId(null))}
                            >
                              Back to diagnostic requests
                            </Button>
                            <DiagnosticRequestDetail id={diagnosticId} />
                          </>
                        ) : (
                          <DiagnosticList
                            patientId={patient.id}
                            onOpen={station ? setDiagnosticId : undefined}
                          />
                        ))}
                      {active === "documents" && <DocumentPanel patientId={patient.id} />}
                      {active === "services" &&
                        (station ? (
                          <PatientRecordBrowse>
                            <PatientServices patientId={patient.id} branchId={patient.branchId} />
                          </PatientRecordBrowse>
                        ) : (
                          <PatientServices patientId={patient.id} branchId={patient.branchId} />
                        ))}
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
                          {!station && <ReportReview patientId={patient.id} />}
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
                {station &&
                  stationDetails?.doctor_profile &&
                  (!stationPayment || !can("billing.read") || !can("payments.record")) && (
                    <p className="rounded-lg bg-info-soft p-3 text-xs leading-6 text-info">
                      Payment recording needs payment access on your account and this device. Your
                      clinic administrator can enable it.
                    </p>
                  )}
                <PatientActionGrid
                  actions={actions}
                  search={search}
                  choose={choose}
                  suggested={suggested}
                  contextual={!!(hasOpenVisit || hasTodayBooking || hasBalance)}
                />
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
