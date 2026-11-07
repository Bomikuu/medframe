"use client";

import { useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Search, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PatientActionGrid } from "@/features/patients/profile/patient-action-grid";
import {
  PatientActionsDialog,
  type ActionId,
} from "@/features/patients/profile/patient-actions-dialog";
import { PatientSearchDialog } from "@/features/patients/patient-search-dialog";
import { profileSummarySchema } from "@/features/patients/profile/summary";
import { PatientRecordDocument, PatientProfileSummaryDocument } from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState } from "@/features/patients/feedback";
import { SafetyProvider, useSafety } from "./safety-provider";
import { useWorkspace } from "./workspace-provider";
import {
  workspaceActions,
  workspaceSettings,
  type WorkspaceAction,
} from "./workspace-actions-catalog";

export function WorkspaceActionsDialog({
  mode,
  close,
  returnFocus,
  currentPatientId,
  initialSearch = "",
}: {
  mode: "actions" | "settings";
  close: () => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
  currentPatientId?: string;
  initialSearch?: string;
}) {
  const { can, href, branchId } = useWorkspace();
  const { guard } = useSafety();
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [stage, setStage] = useState<"catalog" | "picker" | "patient">("catalog");
  const [patientId, setPatientId] = useState("");
  const [patientAction, setPatientAction] = useState<ActionId | null>(null);
  const transferring = useRef(false);
  const settings = mode === "settings";
  const actions = settings ? workspaceSettings(can, href) : workspaceActions(can, href);
  const matching = actions.some((action) =>
    `${action.label} ${action.description}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  function navigate(target: string) {
    void guard(() => {
      close();
      router.push(target);
    });
  }
  function selectPatient(id: string, action: ActionId | null) {
    if (action === "consultation") {
      navigate(`${href("/clinic/consultations/new")}&patient=${encodeURIComponent(id)}`);
    } else {
      transferring.current = true;
      setPatientId(id);
      setStage("patient");
    }
  }
  function choose(action: WorkspaceAction) {
    if (action.href) {
      navigate(action.href);
      return;
    }
    const target = action.patientAction ?? null;
    setPatientAction(target);
    if (currentPatientId) selectPatient(currentPatientId, target);
    else {
      transferring.current = true;
      setStage("picker");
    }
  }
  return (
    <>
      <Dialog
        open={stage === "catalog"}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent
          className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 sm:max-w-4xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!transferring.current) returnFocus.current?.focus();
            transferring.current = false;
          }}
        >
          <DialogHeader className="border-b border-border p-5 pr-14 sm:p-6 sm:pr-14">
            <DialogTitle className="flex items-center gap-2 text-xl">
              {settings ? (
                <Settings aria-hidden className="size-5 text-teal-ink" />
              ) : (
                <LayoutGrid aria-hidden className="size-5 text-teal-ink" />
              )}
              {settings ? "Settings" : "Workspace actions"}
            </DialogTitle>
            <DialogDescription>
              {settings
                ? "Choose a setting available to your account."
                : currentPatientId
                  ? "Patient actions use the profile you are viewing. Clinic shortcuts remain available below."
                  : "Common clinic tasks in one place. Patient tasks ask you to select a patient first."}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
            <div className="relative mb-5">
              <Search
                aria-hidden
                className="absolute top-3.5 left-3 size-4 text-muted-foreground"
              />
              <Input
                autoFocus
                type="search"
                maxLength={160}
                aria-label={settings ? "Search settings" : "Search workspace actions"}
                placeholder={settings ? "Search settings…" : "Search actions…"}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
              />
            </div>
            <PatientActionGrid
              actions={actions}
              search={search}
              choose={choose}
              groupOrder={[...new Set(actions.map((action) => action.group))]}
            />
            {!matching && (
              <p role="status" className="py-8 text-center text-sm text-muted-foreground">
                No {settings ? "settings" : "actions"} match your search.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <PatientSearchDialog
        open={stage === "picker"}
        onOpenChange={(open) => {
          if (!open) {
            setStage("catalog");
          }
        }}
        branchId={branchId}
        title="Choose a patient"
        actionLabel="Select patient for action"
        select={(patient) => selectPatient(patient.id, patientAction)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
      />
      {stage === "patient" && (
        <SafetyProvider>
          <PatientActionLauncher
            patientId={patientId}
            initialAction={patientAction}
            close={close}
            returnFocus={returnFocus}
            navigate={navigate}
          />
        </SafetyProvider>
      )}
    </>
  );
}

function PatientActionLauncher({
  patientId,
  initialAction,
  close,
  returnFocus,
  navigate,
}: {
  patientId: string;
  initialAction: ActionId | null;
  close: () => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
  navigate: (target: string) => void;
}) {
  const { organizationId } = useWorkspace();
  const remote = useRemote(PatientRecordDocument, { organizationId, patientId });
  const summary = useRemote(PatientProfileSummaryDocument, { organizationId, patientId });
  const parsed = profileSummarySchema.safeParse(summary.data?.patientProfileSummary);
  if (!remote.data)
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Patient actions</DialogTitle>
          <DialogDescription>Checking this patient’s current record access.</DialogDescription>
          <LoadState error={remote.error} retry={remote.reload} />
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    );
  return (
    <PatientActionsDialog
      key={patientId}
      patient={remote.data.patientDemographics}
      summary={parsed.success ? parsed.data : null}
      portraitId={parsed.success ? parsed.data.clinical?.portrait_id : undefined}
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      returnFocus={returnFocus}
      initialAction={initialAction}
      updated={() => {
        remote.reload();
        summary.reload();
      }}
      navigate={(target) => navigate(target)}
    />
  );
}
