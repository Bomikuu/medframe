"use client";

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
import { PageHeading, failureCode, failureText, timeLabel } from "@/features/patients/feedback";
import { DentalEditor } from "@/features/dental/dental-editor";
import { DocumentPanel } from "@/features/documents/document-panel";
import { templateSchema } from "./templates/schema";
import { TemplatePicker, TemplatePrompts } from "./templates/template-picker";
import { SoapFields } from "./soap-fields";
import { DiagnosisFields } from "./diagnosis-fields";
import { ProcedureFields } from "./procedure-fields";
import { PatientContext } from "./patient-context";
import { draftSchema, encounterFormSchema, type EncounterForm } from "./schema";

export function EncounterEditor({
  initial,
  exactRevision = false,
  reload,
}: {
  initial: EncounterFieldsFragment;
  exactRevision?: boolean;
  reload: () => void;
}) {
  const { organizationId, href, can } = useWorkspace();
  const { confirm, putDraft, clearDirty, guard } = useSafety();
  const capture = useRequestScope();
  const router = useRouter();
  const [encounter, setEncounter] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [uploadPending, setUploadPending] = useState(false);
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
  const readOnly = exactRevision || !encounter.editable || !can("encounters.write");
  const [review, setReview] = useState(false);
  usePatientDraft(key, form);
  useUnsavedChanges(key, dirty && !readOnly, () => form.reset());

  async function save(): Promise<number | null> {
    if (writing.current || readOnly) return null;
    if (!(await form.trigger(undefined, { shouldFocus: true }))) {
      setStatus("Check the highlighted fields and incomplete entries before saving.");
      return null;
    }
    if (!form.formState.isDirty) return form.getValues("expectedVersion");
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
  return (
    <div className="grid gap-8">
      <PageHeading title={encounter.patientName} description={encounter.reason}>
        <ButtonLink variant="outline" href={href(`/clinic/patients/${encounter.patientId}`)}>
          Patient record
        </ButtonLink>
      </PageHeading>
      <PatientContext
        patientId={encounter.patientId}
        revisionId={encounter.patientHistoryRevisionId}
      />
      {uploadPending && (
        <p role="status" className="text-sm">
          Finish uploading or clear the selected file before completing this consultation.
        </p>
      )}
      <div
        data-panel
        className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-5"
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
          {completed && !exactRevision && can("encounters.write") && (
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
      {!readOnly && (
        <TemplatePicker busy={busy || composing || lifecycleBusy} apply={applyGuidance} />
      )}
      <TemplatePrompts value={encounter.template} />
      <FormProvider {...form}>
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
          <input type="hidden" {...form.register("expectedVersion", { valueAsNumber: true })} />
          <fieldset disabled={readOnly || lifecycleBusy} className="grid min-w-0 gap-10">
            <SoapFields readOnly={readOnly} />
            <DiagnosisFields
              readOnly={readOnly}
              observationLabels={
                templateSchema.safeParse(encounter.template).data?.observation_labels
              }
            />
            <DentalEditor
              readOnly={readOnly}
              patientId={encounter.patientId}
              encounterId={encounter.id}
              revisionId={exactRevision ? initial.revisionId : null}
            />
            <ProcedureFields readOnly={readOnly} />
          </fieldset>
          {Object.keys(form.formState.errors).length > 0 && (
            <p role="alert" className="text-sm text-destructive">
              Check required descriptions, valid tooth identifiers, note lengths, and the combined
              48KiB draft limit.
            </p>
          )}
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
                  : form.getValues("content.document_ids").filter((value) => value !== id),
                { shouldDirty: true },
              )
            }
          />
          {!readOnly && (
            <Button type="submit" disabled={busy} className="justify-self-start">
              Save consultation draft
            </Button>
          )}
        </form>
      </FormProvider>
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
              disabled={busy || !reason.trim()}
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
  );
}
