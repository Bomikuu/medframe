"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { TabsContent } from "@/components/ui/tabs";
import { DocumentPanel } from "@/features/documents/document-panel";
import { SoapFields } from "./soap-fields";
import { DiagnosisFields } from "./diagnosis-fields";
import { ProcedureFields } from "./procedure-fields";
import type { EncounterForm } from "./schema";

/** Panel composition only; the enclosing encounter retains the sole form/save/lifecycle owner. */
export function DocumentationPanels({
  readOnly,
  patientId,
  encounterId,
  observationLabels,
  onUploadPending,
}: {
  readOnly: boolean;
  patientId: string;
  encounterId: string;
  observationLabels?: string[];
  onUploadPending: (pending: boolean) => void;
}) {
  const form = useFormContext<EncounterForm>();
  const attached = useWatch({ control: form.control, name: "content.document_ids" });
  return (
    <>
      <TabsContent value="notes" forceMount className="data-[state=inactive]:hidden">
        <div className="grid min-w-0 gap-6 rounded-xl border border-border bg-card p-4 sm:p-6">
          <SoapFields readOnly={readOnly} />
          <DiagnosisFields readOnly={readOnly} observationLabels={observationLabels} />
        </div>
      </TabsContent>
      <TabsContent value="procedures" forceMount className="data-[state=inactive]:hidden">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <ProcedureFields readOnly={readOnly} />
        </div>
      </TabsContent>
      <TabsContent value="documents" forceMount className="data-[state=inactive]:hidden">
        <DocumentPanel
          patientId={patientId}
          encounterId={encounterId}
          readOnly={readOnly}
          onUploadPending={onUploadPending}
          attachedIds={attached}
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
      </TabsContent>
    </>
  );
}
