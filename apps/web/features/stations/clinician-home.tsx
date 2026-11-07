"use client";

import { LoadingInformation } from "@/components/application/loading-information";
import { AccessRequired } from "@/components/application/access-required";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Users, RefreshCw, CalendarDays } from "lucide-react";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClinicClock } from "./clinic-clock";
import { ConsultationGallery } from "./consultation-gallery";
import { UpcomingCare } from "./upcoming-care";
import { PatientPhotoDialog } from "@/features/patients/profile/patient-photo-dialog";
import { useStationDashboard, clinicTime, type GalleryItem } from "./dashboard-client";
import { ReceiveHandoff } from "./receive-handoff";
import { useStationAccess } from "./access-session";
import { DoctorCodeDialog } from "./doctor-code-dialog";
import { PatientPicker } from "./patient-picker";

export function ClinicianHome() {
  const access = useStationAccess();
  if (access && access.kind !== "doctor")
    return (
      <section className="mx-auto grid max-w-xl gap-5 py-10">
        <h1 className="text-2xl font-semibold">Your assigned consultation</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          This earlier code session is limited to the consultation opened by {access.clinician}. Ask
          for a new doctor workspace code to open other permitted care.
        </p>
        <ButtonLink
          href={`/station/clinician/consultations/${access.encounter_id}?organization=${access.organization_id}`}
        >
          Resume consultation
        </ButtonLink>
      </section>
    );
  return <FullClinicianHome />;
}

function FullClinicianHome() {
  const { organizationId, href, can, workspace, branchId: branch } = useWorkspace();
  const access = useStationAccess();
  const router = useRouter();
  const [patientOpen, setPatientOpen] = useState(false);
  const [view, setView] = useState("today");
  const [before, setBefore] = useState<string | null>(null);
  const [photo, setPhoto] = useState<GalleryItem | null>(null);
  const remote = useStationDashboard(organizationId, branch, view, before);
  const timezone = remote.data?.timezone ?? workspace.organization.timezone;
  if (!can("patients.clinical.read"))
    return (
      <AccessRequired
        title="Clinical workspace access required"
        description="A clinical membership and patient access are required."
      />
    );
  return (
    <div className="grid min-w-0 gap-7">
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-5 border-b border-border pb-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">Clinical Station</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {workspace.organization.name} ·{" "}
            {remote.data?.branch ?? workspace.branches.find((value) => value.id === branch)?.name}
          </p>
        </div>
        <ClinicClock timezone={timezone} />
      </header>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap gap-3">
          {can("encounters.write") && (
            <ButtonLink
              className="min-h-12 gap-2 text-left whitespace-normal"
              href={href("/station/clinician/walk-in")}
            >
              <UserPlus /> Start walk-in
            </ButtonLink>
          )}
          <Button
            className="min-h-12 text-left whitespace-normal"
            variant="outline"
            onClick={() => setPatientOpen(true)}
          >
            <Users /> Choose patient
          </Button>
        </div>
        <div className="flex min-w-0 flex-wrap gap-3">
          {!access && can("encounters.write") && <DoctorCodeDialog />}
        </div>
      </div>
      {remote.error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <p>
            {remote.error}{" "}
            {remote.data
              ? "Showing the last received snapshot. Queue status may have changed."
              : "Clinic information could not be loaded."}
          </p>
          <Button variant="outline" onClick={remote.reload}>
            Retry
          </Button>
        </div>
      )}
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="grid min-w-0 gap-5" aria-label="Patient consultations">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={view}
              onValueChange={(value) => {
                setView(value);
                setBefore(null);
              }}
            >
              <TabsList>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="all">All consultations</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="ghost"
              className="min-h-11"
              onClick={remote.reload}
              disabled={remote.loading}
            >
              <RefreshCw
                className={
                  remote.loading && remote.data ? "animate-spin motion-reduce:animate-none" : ""
                }
              />{" "}
              Refresh
            </Button>
          </div>
          {!remote.data ? (
            remote.error ? (
              <p role="status" className="py-10 text-sm text-muted-foreground">
                Use Retry to reconnect.
              </p>
            ) : (
              <div className="flex min-h-80 items-center justify-center px-6 py-10">
                <LoadingInformation
                  title="Loading your clinical day"
                  detail="Retrieving today’s consultations and scheduled patients."
                />
              </div>
            )
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <p>
                  {view === "today"
                    ? "Today’s consultations & scheduled patients"
                    : "Permitted consultation records"}
                </p>
                <p>Updated {clinicTime(remote.data.updated_at, timezone)}</p>
              </div>
              {remote.data.items.length ? (
                <ConsultationGallery
                  items={remote.data.items}
                  timezone={timezone}
                  onPhoto={setPhoto}
                  showDate={view === "all"}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
                  <CalendarDays className="mx-auto mb-5 size-9 text-muted-foreground" />
                  <h2 className="text-xl font-semibold">
                    {view === "today" ? "A clear day ahead" : "No consultations on this page"}
                  </h2>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                    {view === "today"
                      ? "No permitted consultations or scheduled patients for today. Start a walk-in or choose a patient to begin care."
                      : "Choose a patient to open their history, or return to the latest consultations."}
                  </p>
                </div>
              )}
              {view === "all" && (
                <div className="flex flex-wrap justify-between gap-3">
                  <Button variant="ghost" disabled={!before} onClick={() => setBefore(null)}>
                    Latest consultations
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!remote.data.cursor}
                    onClick={() => setBefore(remote.data!.cursor)}
                  >
                    Older consultations
                  </Button>
                </div>
              )}
              {view === "today" && remote.data.has_more && (
                <p className="text-xs text-muted-foreground">
                  Showing the first 50 records for today. Choose a patient or use All consultations
                  to find more.
                </p>
              )}
            </>
          )}
        </section>
        {remote.data ? (
          <UpcomingCare
            items={remote.data.agenda}
            timezone={timezone}
            truncated={remote.data.agenda_truncated}
            available={remote.data.operations_available}
          />
        ) : (
          <aside
            className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground"
            aria-label="Upcoming care"
          >
            Upcoming care is unavailable until the dashboard connects.
          </aside>
        )}
      </div>
      {!access && (
        <details className="border-t border-border pt-5">
          <summary className="min-h-11 text-sm font-medium">
            Receive clinical responsibility from another doctor
          </summary>
          <div className="mt-5 max-w-xl">
            <ReceiveHandoff />
          </div>
        </details>
      )}
      <Dialog open={patientOpen} onOpenChange={setPatientOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
          <DialogTitle>Choose patient</DialogTitle>
          <DialogDescription>
            Only records permitted to your account and this device’s branch are shown.
          </DialogDescription>
          <PatientPicker
            onSelect={(patient) => {
              setPatientOpen(false);
              router.push(href(`/station/clinician/patients/${patient.id}`));
            }}
          />
        </DialogContent>
      </Dialog>
      {photo && (
        <PatientPhotoDialog
          key={photo.patient_id}
          patient={photo}
          onClose={() => setPhoto(null)}
          onSaved={remote.reload}
        />
      )}
    </div>
  );
}
