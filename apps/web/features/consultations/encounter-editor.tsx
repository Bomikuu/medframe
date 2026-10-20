"use client";
import { useClinicTime } from "@/components/application/clinical-locale";
import { ExportRecord } from "./export/export-record";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { ButtonLink } from "@/components/ui/button-link";
import {
  ApplyConsultationTemplateDocument,
  SaveConsultationDocument,
  ConsultationDocument,
  TransitionConsultationDocument,
  FinalizeConsultationDocument,
  AmendConsultationDocument,
  type EncounterFieldsFragment,
} from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety, useUnsavedChanges } from "@/features/workspace/safety-provider";
import { usePatientDraft } from "@/features/patients/use-patient-draft";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/application/status-badge";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { PageHeading, failureCode, failureText } from "@/features/patients/feedback";
import { AnatomyEditor } from "@/features/anatomy/anatomy-editor";
import { DentalEditor } from "@/features/dental/dental-editor";
import { DocumentPanel } from "@/features/documents/document-panel";
import { templateSchema } from "./templates/schema";
import { TemplatePicker, TemplatePrompts } from "./templates/template-picker";
import { SoapFields } from "./soap-fields";
import { DiagnosisFields } from "./diagnosis-fields";
import { ProcedureFields } from "./procedure-fields";
import { PatientContext } from "./patient-context";
import { draftSchema, encounterFormSchema, type EncounterForm } from "./schema";
import { useEditingLease, type EditingControl } from "@/features/stations/use-editing-lease";
import { HandoffControls } from "@/features/stations/handoff-controls";
import { EditorSelectionContext } from "@/features/stations/editor-selection";
import { VisitContext } from "@/features/stations/visit-context";
import { TreatmentPlans } from "@/features/treatments/treatment-plans";
import { ClinicalAlerts } from "@/features/stations/clinical-alerts";
import { useStationAccess } from "@/features/stations/access-session";

type EditorProps = {
  initial: EncounterFieldsFragment;
  exactRevision?: boolean;
  reload: () => void;
  focused?: boolean;
};

export function EncounterEditor(props: EditorProps) {
  const { organizationId, can } = useWorkspace();
  const enabled = !props.exactRevision && can("encounters.write");
  const leaseControl = useEditingLease(organizationId, props.initial.id, enabled);
  if (enabled && !leaseControl.lease && !leaseControl.error)
    return (
      <p className="p-5 text-sm" role="status">
        Opening this consultation’s editing session…
      </p>
    );
  return <OwnedEncounterEditor {...props} leaseControl={leaseControl} />;
}

function OwnedEncounterEditor({
  initial,
  exactRevision = false,
  reload,
  focused = false,
  leaseControl,
}: EditorProps & { leaseControl: EditingControl }) {
  const stationAccess = useStationAccess();
  const timeLabel = useClinicTime();
  const { organizationId, href, can } = useWorkspace();
  const { confirm, putDraft, clearDirty, guard } = useSafety();
  const capture = useRequestScope();
  const router = useRouter();
  const [encounter, setEncounter] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [uploadPending, setUploadPending] = useState(false);
  const [chartPending, setChartPending] = useState(false);
  const handoffSnapshot = useRef("");
  const writing = useRef(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [status, setStatus] = useState("Saved draft loaded");
  const [composing, setComposing] = useState(false);
  const [reason, setReason] = useState("");
  useEffect(
    () => () => {
      writing.current = false;
      setBusy(false);
      setLifecycleBusy(false);
    },
    [],
  );
  const key = `${organizationId}:${initial.id}:${initial.revisionId ?? "draft"}:consultation`;
  const form = useForm<EncounterForm>({
    resolver: zodResolver(encounterFormSchema),
    defaultValues: {
      content: draftSchema.parse(initial.content),
      expectedVersion: initial.version,
    },
  });
  const watched = useWatch({ control: form.control });
  const dirty = form.formState.isDirty;
  const readOnly =
    exactRevision || !encounter.editable || !can("encounters.write") || !leaseControl.canEdit;
  const [review, setReview] = useState(false);
  const [clinicalTab, setClinicalTab] = useState(
    leaseControl.initialSelection.tab ||
      (initial.providerSpecialty === "general_medicine" ? "anatomy" : "dental"),
  );
  const updateSelection = leaseControl.updateSelection;
  useEffect(() => {
    updateSelection({ tab: clinicalTab });
  }, [clinicalTab, updateSelection]);
  usePatientDraft(key, form);
  useUnsavedChanges(key, dirty, () => form.reset());

  async function save(): Promise<number | null> {
    if (writing.current || readOnly) return null;
    if (!(await form.trigger(undefined, { shouldFocus: true }))) {
      setStatus("Check the highlighted fields and incomplete entries before saving.");
      return null;
    }
    if (!form.formState.isDirty) {
      handoffSnapshot.current = JSON.stringify(form.getValues("content"));
      return form.getValues("expectedVersion");
    }
    writing.current = true;
    setBusy(true);
    setFailure(null);
    setStatus("Saving draft…");
    const isCurrent = capture();
    const values = structuredClone(form.getValues());
    try {
      const result = await getGraphqlClient().request(SaveConsultationDocument, {
        organizationId,
        encounterId: encounter.id,
        content: values.content,
        expectedVersion: values.expectedVersion,
      });
      if (!isCurrent()) return null;
      const saved = result.updateEncounterDraft;
      handoffSnapshot.current = JSON.stringify(draftSchema.parse(saved.content));
      const latestInput = structuredClone(form.getValues("content"));
      form.reset({ content: draftSchema.parse(saved.content), expectedVersion: saved.version });
      if (JSON.stringify(latestInput) !== JSON.stringify(values.content))
        form.setValue("content", latestInput, { shouldDirty: true });
      else putDraft(key, undefined);
      setEncounter(saved);
      setStatus("Draft saved");
      return saved.version;
    } catch (error) {
      if (isCurrent()) {
        setFailure(error);
        setStatus("Autosave paused. Your input is still here.");
        if (["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED"].includes(failureCode(error))) {
          clearDirty();
          reload();
        }
      }
      return null;
    } finally {
      if (isCurrent()) {
        writing.current = false;
        setBusy(false);
      }
    }
  }
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  const serialized = JSON.stringify(watched.content);
  useEffect(() => {
    if (!dirty || readOnly || busy || failure || composing) return;
    const timeout = window.setTimeout(() => void saveRef.current(), 1500);
    return () => window.clearTimeout(timeout);
  }, [serialized, dirty, readOnly, busy, failure, composing]);

  async function applyGuidance(templateRevisionId: string) {
    if (writing.current || composing || lifecycleBusy) return;
    setLifecycleBusy(true);
    const isCurrent = capture();
    const version = await save();
    if (version === null || !isCurrent()) {
      if (isCurrent()) setLifecycleBusy(false);
      return;
    }
    writing.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const result = await getGraphqlClient().request(ApplyConsultationTemplateDocument, {
        organizationId,
        encounterId: encounter.id,
        templateRevisionId,
        expectedVersion: version,
        requestId: crypto.randomUUID(),
      });
      if (!isCurrent()) return;
      const saved = result.applyConsultationTemplate;
      setEncounter(saved);
      form.reset({ content: draftSchema.parse(saved.content), expectedVersion: saved.version });
      putDraft(key, undefined);
      setStatus("Guidance applied. Clinical content preserved.");
    } catch (error) {
      if (isCurrent()) setFailure(error);
    } finally {
      if (isCurrent()) {
        writing.current = false;
        setBusy(false);
        setLifecycleBusy(false);
      }
    }
  }

  async function transition(target: string) {
    setLifecycleBusy(true);
    const isCurrent = capture();
    const version = dirty ? await save() : form.getValues("expectedVersion");
    if (version === null || writing.current || !isCurrent()) {
      if (isCurrent()) setLifecycleBusy(false);
      return;
    }
    writing.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const result = await getGraphqlClient().request(TransitionConsultationDocument, {
        organizationId,
        encounterId: encounter.id,
        status: target,
        expectedVersion: version,
      });
      if (!isCurrent()) return;
      setEncounter(result.transitionEncounter);
      form.reset({
        content: draftSchema.parse(result.transitionEncounter.content),
        expectedVersion: result.transitionEncounter.version,
      });
      putDraft(key, undefined);
      setStatus(
        target === "completed"
          ? "Completed draft ready for final review"
          : "Consultation reopened for editing",
      );
    } catch (error) {
      if (isCurrent()) setFailure(error);
    } finally {
      if (isCurrent()) {
        writing.current = false;
        setBusy(false);
        setLifecycleBusy(false);
      }
    }
  }

  async function finalize() {
    if (
      writing.current ||
      !(await confirm({
        title: "Finalize this consultation?",
        description:
          "Review the notes, diagnosis certainty, tooth findings, procedures, and attached files. Finalized care is preserved; later corrections require an attributed amendment.",
        action: "Finalize consultation",
      }))
    )
      return;
    const isCurrent = capture();
    writing.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const result = await getGraphqlClient().request(FinalizeConsultationDocument, {
        organizationId,
        encounterId: encounter.id,
        expectedVersion: form.getValues("expectedVersion"),
      });
      if (!isCurrent()) return;
      setEncounter(result.finalizeEncounter);
      form.reset({
        content: draftSchema.parse(result.finalizeEncounter.content),
        expectedVersion: result.finalizeEncounter.version,
      });
      putDraft(key, undefined);
      setStatus("Consultation finalized. The exact saved revision is preserved.");
      reload();
    } catch (error) {
      if (isCurrent()) setFailure(error);
    } finally {
      if (isCurrent()) {
        writing.current = false;
        setBusy(false);
      }
    }
  }

  async function amend() {
    if (writing.current || !reason.trim()) return;
    const isCurrent = capture();
    writing.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const result = await getGraphqlClient().request(AmendConsultationDocument, {
        organizationId,
        encounterId: encounter.id,
        reason: reason.trim(),
        expectedFinalizedVersion: encounter.latestFinalizedVersion,
      });
      if (!isCurrent()) return;
      setEncounter(result.createEncounterAmendment);
      form.reset({
        content: draftSchema.parse(result.createEncounterAmendment.content),
        expectedVersion: result.createEncounterAmendment.version,
      });
      setStatus("Amendment draft started. The original remains unchanged.");
      if (exactRevision) router.push(href(`/clinic/consultations/${encounter.id}`));
    } catch (error) {
      if (isCurrent()) setFailure(error);
    } finally {
      if (isCurrent()) {
        writing.current = false;
        setBusy(false);
      }
    }
  }

  async function loadLatest() {
    const isCurrent = capture();
    setBusy(true);
    setLifecycleBusy(true);
    writing.current = true;
    try {
      const result = await getGraphqlClient().request(ConsultationDocument, {
        organizationId,
        encounterId: encounter.id,
        revisionId: exactRevision ? initial.revisionId : null,
      });
      if (!isCurrent()) return;
      setEncounter(result.encounter);
      form.reset({
        content: draftSchema.parse(result.encounter.content),
        expectedVersion: result.encounter.version,
      });
      putDraft(key, undefined);
      setFailure(null);
      setStatus("Latest saved version loaded for review");
    } catch (error) {
      if (isCurrent()) setFailure(error);
    } finally {
      if (isCurrent()) {
        writing.current = false;
        setBusy(false);
        setLifecycleBusy(false);
      }
    }
  }

  const completed =
    encounter.status === "completed" || (encounter.isAmendment && !encounter.editable);
  const stationActions =
    !exactRevision && can("encounters.write") ? (
      <HandoffControls
        control={leaseControl}
        encounterId={encounter.id}
        save={save}
        hasUnsaved={() =>
          JSON.stringify(form.getValues("content")) !== handoffSnapshot.current ||
          writing.current ||
          uploadPending ||
          chartPending ||
          composing
        }
        busy={busy || lifecycleBusy || uploadPending || chartPending || composing}
        freeze={setLifecycleBusy}
      />
    ) : null;
  const clinicalNavigation = (
    <nav
      aria-label="Station consultation sections"
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-card px-3"
    >
      {[
        ["notes", "Clinical notes"],
        ["dental", "Dental chart"],
        ["anatomy", "Anatomy"],
        ["procedures", "Procedures"],
        ["documents", "Documents"],
        ["plan", "Treatment plan"],
        ["visit", "Visit & payments"],
      ].map(([value, label]) => (
        <Button
          key={value}
          type="button"
          variant="ghost"
          className="min-h-11 shrink-0 rounded-none"
          aria-current={clinicalTab === value ? "page" : undefined}
          onClick={() => setClinicalTab(value)}
        >
          {label}
        </Button>
      ))}
    </nav>
  );
  return (
    <EditorSelectionContext.Provider
      value={{ initial: leaseControl.initialSelection, update: leaseControl.updateSelection }}
    >
      <div className={`grid gap-6 ${focused ? "pb-6" : ""}`}>
        <section
          data-panel
          className="flex min-w-0 flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5 sm:p-6"
        >
          <PatientAvatar name={encounter.patientName} className="size-16 border-0 text-lg" />
          <div className="min-w-0 flex-1 basis-64 [&_[data-page-header]]:mb-0">
            <PageHeading title={encounter.patientName} description={encounter.reason}>
              {!stationAccess && (
                <ButtonLink
                  variant="outline"
                  href={href(`/clinic/patients/${encounter.patientId}`)}
                >
                  Patient record
                </ButtonLink>
              )}
            </PageHeading>
            <div className="mt-3">
              <StatusBadge value={encounter.status} />
            </div>
          </div>
        </section>

        {uploadPending && (
          <p role="status" className="text-sm">
            Finish uploading or clear the selected file before completing this consultation.
          </p>
        )}
        <div
          data-panel
          className="sticky top-[72px] z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
        >
          <div>
            <p className="font-medium">
              {encounter.isAmendment ? "Amendment draft" : encounter.status.replaceAll("_", " ")}
              {exactRevision ? " · historical revision" : ""}
            </p>
            <p role="status" className="mt-1 text-sm text-muted-foreground">
              {status}
            </p>
            {encounter.amendmentReason && (
              <p className="mt-2 text-sm">Amendment reason: {encounter.amendmentReason}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {stationActions}
            {encounter.revisionId && !stationActions && (
              <ExportRecord encounterId={encounter.id} revisionId={encounter.revisionId} />
            )}
            {!readOnly && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void save()}
                  aria-busy={busy}
                >
                  Save draft
                </Button>
                <Button
                  type="button"
                  disabled={busy || uploadPending}
                  onClick={() => void transition("completed")}
                >
                  Mark completed
                </Button>
              </>
            )}
            {completed && !exactRevision && can("encounters.write") && leaseControl.canEdit && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void transition("in_progress")}
                >
                  Reopen draft
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setReview(true);
                    void finalize();
                  }}
                >
                  Review and finalize
                </Button>
              </>
            )}
          </div>
        </div>
        {!exactRevision && can("encounters.write") && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm"
          >
            <p>
              {leaseControl.error ||
                (!leaseControl.lease
                  ? "Identifying this editing device…"
                  : leaseControl.canEdit
                    ? "Editing on this device · changes use the existing consultation draft"
                    : `Read only · ${leaseControl.lease.owner || "another clinician"} · ${leaseControl.lease.locked ? "Station locked" : leaseControl.lease.live ? leaseControl.lease.device : "editing lease expired"}`)}
            </p>
            {!leaseControl.canEdit && dirty && (
              <p className="text-muted-foreground">
                Unsaved input is preserved here. Review it before loading another version.
              </p>
            )}
          </div>
        )}
        {review && (
          <p className="text-sm text-muted-foreground">
            Finalization preserves the reviewed revision. Pending or unsafe attachments must be
            removed or cleared first.
          </p>
        )}
        {failure !== null && (
          <div role="alert" className="grid gap-3 rounded-lg border border-destructive p-5">
            <p>{failureText(failure)}</p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => void guard(() => void loadLatest(), dirty)}
              >
                Discard input and load latest
              </Button>
              {!readOnly && (
                <Button type="button" disabled={busy} onClick={() => void save()}>
                  Retry save
                </Button>
              )}
            </div>
          </div>
        )}
        <details className="rounded-lg border border-border px-4 py-3">
          <summary className="min-h-8 text-sm font-medium">Consultation template & prompts</summary>
          <div className="grid gap-4 py-3">
            {!readOnly && !stationAccess && (
              <TemplatePicker busy={busy || composing || lifecycleBusy} apply={applyGuidance} />
            )}
            <TemplatePrompts value={encounter.template} />
          </div>
        </details>
        <div
          className={`grid min-w-0 items-start gap-6 ${["dental", "anatomy"].includes(clinicalTab) ? "" : "xl:grid-cols-[minmax(0,1fr)_280px]"}`}
        >
          <div className="min-w-0">
            <FormProvider {...form}>
              <Tabs value={clinicalTab} onValueChange={setClinicalTab} className="min-w-0 gap-6">
                <div className="overflow-x-auto border-b border-border">
                  <TabsList variant="line" className="min-w-max">
                    <TabsTrigger value="notes">Notes & diagnoses</TabsTrigger>
                    <TabsTrigger value="anatomy">Anatomy</TabsTrigger>
                    <TabsTrigger value="dental">Dental chart</TabsTrigger>
                    <TabsTrigger value="procedures">Procedures</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="visit">Visit & payments</TabsTrigger>
                    <TabsTrigger value="plan">Treatment plan</TabsTrigger>
                  </TabsList>
                </div>
                <form
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    void save();
                  }}
                  onCompositionStart={() => setComposing(true)}
                  onCompositionEnd={() => setComposing(false)}
                  className="grid gap-10"
                >
                  <input
                    type="hidden"
                    {...form.register("expectedVersion", { valueAsNumber: true })}
                  />
                  <TabsContent value="notes" forceMount className="data-[state=inactive]:hidden">
                    <div className="grid min-w-0 gap-6 rounded-xl border border-border bg-card p-4 sm:p-6">
                      <SoapFields readOnly={readOnly || lifecycleBusy} />
                      <DiagnosisFields
                        readOnly={readOnly || lifecycleBusy}
                        observationLabels={
                          templateSchema.safeParse(encounter.template).data?.observation_labels
                        }
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="anatomy" forceMount className="data-[state=inactive]:hidden">
                    <AnatomyEditor
                      active={clinicalTab === "anatomy"}
                      readOnly={readOnly || lifecycleBusy}
                      patientId={encounter.patientId}
                      save={save}
                      consultation={{
                        patientName: encounter.patientName,
                        patientId: encounter.patientId,
                        status: encounter.isAmendment ? "amendment draft" : encounter.status,
                        saveStatus:
                          leaseControl.error ||
                          (!leaseControl.canEdit
                            ? "Read only · editing control is unavailable on this device"
                            : status),
                        error: failure ? failureText(failure) : undefined,
                        busy: busy || lifecycleBusy,
                        canComplete: !readOnly,
                        canFinalize:
                          completed &&
                          !exactRevision &&
                          can("encounters.write") &&
                          leaseControl.canEdit,
                        stationActions,
                        navigation: clinicalNavigation,
                        clinicalContext: (
                          <ClinicalAlerts
                            patientId={encounter.patientId}
                            revisionId={encounter.patientHistoryRevisionId}
                            active={clinicalTab === "anatomy"}
                          />
                        ),
                        onComplete: () => void transition("completed"),
                        onFinalize: () => {
                          setReview(true);
                          void finalize();
                        },
                        onBack: () => setClinicalTab("notes"),
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="dental" forceMount className="data-[state=inactive]:hidden">
                    <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6">
                      <DentalEditor
                        onPendingChange={setChartPending}
                        clinicalContext={
                          <ClinicalAlerts
                            patientId={encounter.patientId}
                            revisionId={encounter.patientHistoryRevisionId}
                            active={clinicalTab === "dental"}
                          />
                        }
                        active={clinicalTab === "dental"}
                        patientName={encounter.patientName}
                        reason={encounter.reason}
                        encounterStatus={exactRevision ? "historical" : encounter.status}
                        onPatientRecord={() =>
                          void guard(() =>
                            router.push(href(`/clinic/patients/${encounter.patientId}`)),
                          )
                        }
                        navigation={clinicalNavigation}
                        onExit={() => setClinicalTab("notes")}
                        actions={
                          <>
                            {stationActions}
                            {!readOnly && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={busy || lifecycleBusy || composing}
                                  onClick={() => void save()}
                                >
                                  Save draft
                                </Button>
                                <Button
                                  type="button"
                                  disabled={busy || lifecycleBusy || composing || uploadPending}
                                  onClick={() => void transition("completed")}
                                >
                                  Mark completed
                                </Button>
                              </>
                            )}
                            {completed &&
                              !exactRevision &&
                              can("encounters.write") &&
                              leaseControl.canEdit && (
                                <Button
                                  type="button"
                                  disabled={busy || lifecycleBusy || uploadPending}
                                  onClick={() => {
                                    setReview(true);
                                    void finalize();
                                  }}
                                >
                                  Review and finalize
                                </Button>
                              )}
                          </>
                        }
                        feedback={
                          <>
                            {failure !== null ? (
                              <span role="alert" className="text-destructive">
                                {failureText(failure)}
                              </span>
                            ) : (
                              leaseControl.error ||
                              (!leaseControl.canEdit
                                ? "Read only · editing control is unavailable on this device"
                                : status)
                            )}
                            {Object.keys(form.formState.errors).length > 0 && (
                              <span className="ml-2 text-destructive">
                                Check required findings and the combined draft size.
                              </span>
                            )}
                          </>
                        }
                        readOnly={readOnly || lifecycleBusy}
                        patientId={encounter.patientId}
                        encounterId={encounter.id}
                        revisionId={exactRevision ? initial.revisionId : null}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent
                    value="procedures"
                    forceMount
                    className="data-[state=inactive]:hidden"
                  >
                    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
                      <ProcedureFields readOnly={readOnly || lifecycleBusy} />
                    </div>
                  </TabsContent>
                  <TabsContent
                    value="documents"
                    forceMount
                    className="data-[state=inactive]:hidden"
                  >
                    {" "}
                    <DocumentPanel
                      patientId={encounter.patientId}
                      encounterId={encounter.id}
                      readOnly={readOnly || lifecycleBusy}
                      onUploadPending={setUploadPending}
                      attachedIds={watched.content?.document_ids}
                      onAttach={(id, attach) =>
                        form.setValue(
                          "content.document_ids",
                          attach
                            ? [...form.getValues("content.document_ids"), id]
                            : form
                                .getValues("content.document_ids")
                                .filter((value) => value !== id),
                          { shouldDirty: true },
                        )
                      }
                    />
                  </TabsContent>
                  {Object.keys(form.formState.errors).length > 0 && (
                    <p role="alert" className="text-sm text-destructive">
                      Check required descriptions, valid tooth identifiers, note lengths, and the
                      combined 48KiB draft limit.
                    </p>
                  )}
                  {!readOnly && (
                    <Button type="submit" disabled={busy} className="justify-self-start">
                      Save consultation draft
                    </Button>
                  )}
                </form>
                <TabsContent value="visit">
                  <VisitContext
                    patientId={encounter.patientId}
                    branchId={encounter.branchId}
                    encounterId={encounter.id}
                  />
                </TabsContent>
                <TabsContent value="plan">
                  <TreatmentPlans patientId={encounter.patientId} />
                </TabsContent>
              </Tabs>
            </FormProvider>
          </div>
          <aside className={clinicalTab === "dental" ? "min-w-0" : "min-w-0 xl:sticky xl:top-40"}>
            <PatientContext
              patientId={encounter.patientId}
              revisionId={encounter.patientHistoryRevisionId}
            />
          </aside>
        </div>
        {!encounter.isAmendment &&
          ["finalized", "amended"].includes(encounter.status) &&
          can("encounters.write") && (
            <section className="grid max-w-2xl gap-4 border-t border-border pt-6">
              <h2 className="text-xl font-semibold">Amend finalized care</h2>
              <FormField id="amendmentReason" label="Reason for amendment">
                <Input
                  id="amendmentReason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={500}
                />
              </FormField>
              <Button
                type="button"
                variant="outline"
                onClick={() => void amend()}
                disabled={busy || !reason.trim() || !leaseControl.canEdit}
                className="justify-self-start"
              >
                Start amendment
              </Button>
            </section>
          )}
        {!!encounter.revisions.length && (
          <section>
            <h2 className="text-xl font-semibold">Preserved revisions</h2>
            <ul className="mt-4 grid gap-4">
              {encounter.revisions.map((revision) => (
                <li key={revision.id}>
                  <ButtonLink
                    variant="outline"
                    href={`${href(`/clinic/consultations/${encounter.id}`)}&revision=${revision.id}`}
                  >
                    Open revision {revision.version}
                  </ButtonLink>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {revision.authorName} · {timeLabel(revision.createdAt)}
                    {revision.amendmentReason ? ` · ${revision.amendmentReason}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </EditorSelectionContext.Provider>
  );
}
