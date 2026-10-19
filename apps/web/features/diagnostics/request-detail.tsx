"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { LoadState, PageHeading } from "@/features/patients/feedback";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety, useUnsavedChanges } from "@/features/workspace/safety-provider";
import { DiagnosticRequestDocument, DiagnosticPreviewDocument } from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { detailSchema, stateLabel, type DiagnosticDetail } from "./schema";
import { useDiagnosticAction } from "./use-diagnostics";
import { DiagnosticResultView, DiagnosticFile } from "./result-view";
import { ResultUpload } from "./result-upload";
import { DiagnosticHistory } from "./request-history";
export function DiagnosticRequestDetail({
  id,
  context = "clinic",
}: {
  id: string;
  context?: "clinic" | "center";
}) {
  const { organizationId } = useWorkspace();
  const remote = useRemote(DiagnosticRequestDocument, { organizationId, requestId: id, context });
  const parsed = detailSchema.safeParse(remote.data?.diagnosticRequest);
  if (!parsed.success) return <LoadState error={remote.error} retry={remote.reload} />;
  return (
    <RequestBody
      key={`${organizationId}:${id}:${parsed.data.version}`}
      row={parsed.data}
      context={context}
      reload={remote.reload}
    />
  );
}
function RequestBody({
  row,
  context,
  reload,
}: {
  row: DiagnosticDetail;
  context: "clinic" | "center";
  reload: () => void;
}) {
  const { organizationId, can } = useWorkspace();
  const { confirm } = useSafety();
  const action = useDiagnosticAction();
  const [reason, setReason] = useState("");
  const [centerId, setCenterId] = useState("");
  const [report, setReport] = useState(row.draft?.report ?? "");
  const [accession, setAccession] = useState(row.draft?.accession ?? "");
  const [interpretation, setInterpretation] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [performed, setPerformed] = useState("");
  const [preview, setPreview] = useState<{ digest: string; package: unknown } | null>(null);
  const [previewError, setPreviewError] = useState("");
  useUnsavedChanges(
    `diagnostic:${organizationId}:${row.id}`,
    report !== (row.draft?.report ?? "") ||
      accession !== (row.draft?.accession ?? "") ||
      !!interpretation ||
      !!nextSteps,
    () => {
      setReport(row.draft?.report ?? "");
      setAccession(row.draft?.accession ?? "");
      setInterpretation("");
      setNextSteps("");
    },
  );
  async function run(name: string, data: Record<string, unknown> = {}, confirmation = true) {
    if (
      confirmation &&
      !(await confirm({
        title: `${stateLabel(name)}?`,
        description:
          "This action is attributed and preserves earlier evidence. Check the selected request and exact result version before continuing.",
        action: stateLabel(name),
      }))
    )
      return;
    const result = await action.run(name, {
      id: row.id,
      expected_version: row.version,
      reason,
      ...data,
    });
    if (result) {
      setInterpretation("");
      setNextSteps("");
      reload();
    }
  }
  return (
    <div className="grid min-w-0 gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading
          title={row.details.test_name}
          description={`${row.patient_name} · ${row.number} · ${row.provider}`}
        />
        <Button variant="outline" onClick={reload}>
          Refresh
        </Button>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-md bg-muted px-3 py-2 capitalize">{stateLabel(row.state)}</span>
        <span className="rounded-md bg-muted px-3 py-2">
          {row.sharing ? "Referral sharing active" : "Referral sharing withdrawn"}
        </span>
        <span className="px-3 py-2">{row.center_name ?? "Awaiting center selection"}</span>
      </div>
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="grid min-w-0 gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Request package</h2>
          {row.package.identity && (
            <p className="text-sm leading-6">
              {row.package.identity.name} · {row.package.identity.reference}
              <br />
              {row.package.identity.date_of_birth ?? "Birth date not recorded"} ·{" "}
              {row.package.identity.sex}
            </p>
          )}
          <dl className="grid gap-4 text-sm">
            {[
              ["Modality", row.details.modality],
              ["Body region", row.details.region],
              ["Clinical question", row.details.question],
              ["Preparation", row.details.instructions],
              ["Priority", row.details.urgency],
              ["Requested by", row.details.requested_by ?? "Not specified"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="font-medium text-muted-foreground">{label}</dt>
                <dd className="mt-1 leading-7 wrap-anywhere whitespace-pre-wrap">
                  {value || "Not recorded"}
                </dd>
              </div>
            ))}
          </dl>
          {row.package.files?.map((file) => (
            <DiagnosticFile key={file.id} requestId={row.id} context={context} file={file} />
          ))}
          {row.result?.files.map((file) => (
            <DiagnosticFile key={file.id} requestId={row.id} context={context} file={file} />
          ))}
        </section>
        <section className="grid min-w-0 gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          {row.result && (
            <DiagnosticResultView result={row.result} requestId={row.id} context={context} />
          )}
          {context === "clinic" && row.state === "draft" && (
            <>
              <h2 className="text-xl font-semibold">Preview before sharing</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                The center receives only this identity, question and the selected exact file
                versions. Issue makes the request available for patient center selection.
              </p>
              <Button
                variant="outline"
                disabled={action.busy}
                onClick={async () => {
                  setPreviewError("");
                  try {
                    const response = await getGraphqlClient().request(DiagnosticPreviewDocument, {
                      organizationId,
                      requestId: row.id,
                    });
                    setPreview(response.diagnosticPreview as { digest: string; package: unknown });
                  } catch {
                    setPreviewError("Preview unavailable. Refresh the request and try again.");
                  }
                }}
              >
                Preview sharing package
              </Button>
              {previewError && <p role="alert">{previewError}</p>}
              {preview && (
                <div className="grid gap-4">
                  <p className="text-sm">
                    The identity and requested clinical details shown in the request package will be
                    shared, together with the selected files.
                  </p>
                  <Button
                    disabled={action.busy}
                    onClick={() => void run("issue", { preview_digest: preview.digest })}
                  >
                    Issue request
                  </Button>
                </div>
              )}
            </>
          )}
          {context === "center" && row.state === "sent" && (
            <Button disabled={action.busy} onClick={() => void run("accept")}>
              Accept request
            </Button>
          )}
          {context === "center" && row.state === "accepted" && (
            <>
              <FormField id="dx-performed" label="Examination performed at">
                <Input
                  id="dx-performed"
                  type="datetime-local"
                  value={performed}
                  onChange={(e) => setPerformed(e.target.value)}
                />
              </FormField>
              <Button
                disabled={action.busy || !performed}
                onClick={() =>
                  void run("performed", { performed_at: new Date(performed).toISOString() })
                }
              >
                Record examination
              </Button>
            </>
          )}
          {context === "center" && row.state === "performed" && (
            <>
              <h2 className="text-xl font-semibold">Result report</h2>
              <FormField id="dx-report" label="Center-authored report">
                <Textarea
                  id="dx-report"
                  rows={10}
                  maxLength={12000}
                  value={report}
                  onChange={(e) => setReport(e.target.value)}
                />
              </FormField>
              <FormField id="dx-accession" label="Accession or external reference (optional)">
                <Input
                  id="dx-accession"
                  maxLength={120}
                  value={accession}
                  onChange={(e) => setAccession(e.target.value)}
                />
              </FormField>
              <Button
                variant="outline"
                disabled={action.busy}
                onClick={() => void run("save_result", { report, accession }, false)}
              >
                Save report draft
              </Button>
              <ResultUpload requestId={row.id} reload={reload} />
              {row.draft?.files.map((file) => (
                <p key={file.id} className="text-sm">
                  {file.label} · Security scan: {file.scan_state}
                </p>
              ))}
              <p className="text-sm text-muted-foreground">
                Save the report first. Submit publishes that saved version; all attachments must
                have a clean scan.
              </p>
              <Button
                disabled={
                  action.busy ||
                  report !== (row.draft?.report ?? "") ||
                  accession !== (row.draft?.accession ?? "")
                }
                onClick={() => void run("submit_result")}
              >
                Submit saved result
              </Button>
            </>
          )}
          {context === "clinic" &&
            row.state === "results_available" &&
            can("diagnostics.review") && (
              <>
                <h2 className="text-xl font-semibold">Review current result</h2>
                <FormField id="dx-interpretation" label="Clinical interpretation">
                  <Textarea
                    id="dx-interpretation"
                    maxLength={4000}
                    rows={5}
                    value={interpretation}
                    onChange={(e) => setInterpretation(e.target.value)}
                  />
                </FormField>
                <FormField id="dx-next" label="Next steps">
                  <Textarea
                    id="dx-next"
                    maxLength={2000}
                    value={nextSteps}
                    onChange={(e) => setNextSteps(e.target.value)}
                  />
                </FormField>
                <Button
                  disabled={action.busy || !interpretation.trim()}
                  onClick={() =>
                    void run("review", {
                      result_id: row.result?.id,
                      interpretation,
                      next_steps: nextSteps,
                      acknowledged: true,
                    })
                  }
                >
                  Acknowledge and save review
                </Button>
                <p className="text-sm text-muted-foreground">
                  Patient results require a separate explicit release in Shared records.
                </p>
              </>
            )}
          <FormField
            id="dx-reason"
            label="Reason for decline, recall, cancellation or sharing change"
          >
            <Textarea
              id="dx-reason"
              maxLength={240}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </FormField>
          <div className="flex flex-wrap gap-3">
            {context === "center" && row.state === "sent" && (
              <Button
                variant="outline"
                disabled={action.busy || !reason}
                onClick={() => void run("decline")}
              >
                Decline
              </Button>
            )}
            {context === "center" && ["results_available", "reviewed"].includes(row.state) && (
              <Button
                variant="outline"
                disabled={action.busy || !reason}
                onClick={() => void run("start_correction")}
              >
                Start correction
              </Button>
            )}
            {context === "clinic" && !["draft", "cancelled"].includes(row.state) && (
              <Button
                variant="outline"
                disabled={action.busy || !reason}
                onClick={() => void run(row.sharing ? "withdraw_sharing" : "resume_sharing")}
              >
                {row.sharing ? "Withdraw sharing" : "Resume sharing"}
              </Button>
            )}
            {context === "clinic" &&
              ["sent", "accepted", "performed"].includes(row.state) &&
              !row.result && (
                <Button
                  variant="outline"
                  disabled={action.busy || !reason}
                  onClick={() => void run("recall")}
                >
                  Recall for reselection
                </Button>
              )}
            {context === "clinic" &&
              ["draft", "awaiting_center", "sent", "accepted", "performed"].includes(row.state) &&
              !row.result && (
                <Button
                  variant="destructive"
                  disabled={action.busy || !reason}
                  onClick={() => void run("cancel")}
                >
                  Cancel request
                </Button>
              )}
          </div>
          {context === "clinic" && ["awaiting_center", "sent"].includes(row.state) && (
            <>
              <FormField id="dx-assisted" label="Assisted center selection">
                <FormSelect
                  id="dx-assisted-choice"
                  label="Authorized center"
                  value={centerId}
                  onChange={setCenterId}
                  options={[
                    { value: "", label: "Choose authorized center" },
                    ...row.centers.map((center) => ({ value: center.id, label: center.name })),
                  ]}
                />
              </FormField>
              <Button
                variant="outline"
                disabled={action.busy || !reason || !centerId}
                onClick={() => void run("assisted_select", { center_id: centerId })}
              >
                Record assisted selection
              </Button>
              <p className="text-sm text-muted-foreground">
                Patients normally choose their authorized center in the patient portal. Assistance
                requires the reason above.
              </p>
            </>
          )}
          {action.error && (
            <p role="alert" className="text-destructive">
              {action.error}
            </p>
          )}
        </section>
      </div>
      <DiagnosticHistory id={row.id} context={context} />
    </div>
  );
}
