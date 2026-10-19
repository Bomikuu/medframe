import { z } from "zod";
export const diagnosticRow = z.object({
  id: z.string(),
  number: z.string(),
  version: z.number(),
  state: z.string(),
  sharing: z.boolean(),
  test_name: z.string(),
  modality: z.string(),
  created_at: z.string(),
  center_name: z.string().nullable(),
  patient_name: z.string().optional(),
  patient_id: z.string().optional(),
  instructions: z.string().optional(),
});
export const diagnosticPage = z.object({
  items: z.array(diagnosticRow),
  end_cursor: z.string().nullable(),
  has_next_page: z.boolean(),
});
export const fileSchema = z.object({
  id: z.string(),
  label: z.string(),
  content_type: z.string(),
  scan_state: z.string().optional(),
});
export const resultSchema = z.object({
  id: z.string(),
  sequence: z.number(),
  report: z.string(),
  accession: z.string(),
  reason: z.string(),
  performed_at: z.string(),
  submitted_at: z.string(),
  author: z.string(),
  files: z.array(fileSchema),
  review: z
    .object({
      interpretation: z.string(),
      next_steps: z.string(),
      author: z.string(),
      reviewed_at: z.string(),
    })
    .nullable(),
});
export const centerSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  modalities: z.array(z.string()),
  address: z.string(),
  accepting: z.boolean(),
  version: z.number(),
  authorized: z.boolean().optional(),
  partnership_version: z.number().optional(),
});
export const setupSchema = z.object({
  patients: z.array(z.object({ id: z.string(), name: z.string(), reference: z.string() })),
  files: z.array(z.object({ id: z.string(), label: z.string() })),
  centers: z.array(centerSchema),
});
export const detailSchema = diagnosticRow.extend({
  centers: z.array(centerSchema),
  details: z.object({
    test_name: z.string(),
    modality: z.string(),
    question: z.string(),
    region: z.string(),
    instructions: z.string(),
    urgency: z.string(),
    requested_by: z.string().nullable(),
  }),
  package: z.object({
    identity: z
      .object({
        name: z.string(),
        reference: z.string(),
        sex: z.string(),
        date_of_birth: z.string().nullable(),
      })
      .optional(),
    files: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          filename: z.string(),
          content_type: z.string(),
        }),
      )
      .optional(),
  }),
  provider: z.string(),
  accepted_at: z.string().nullable(),
  result: resultSchema.nullable(),
  draft: z
    .object({
      report: z.string(),
      accession: z.string(),
      reason: z.string(),
      files: z.array(fileSchema),
    })
    .nullable(),
});
export type DiagnosticRow = z.infer<typeof diagnosticRow>;
export type DiagnosticDetail = z.infer<typeof detailSchema>;
export const modalities = ["xray", "laboratory", "ultrasound", "ct", "mri", "other"].map(
  (value) => ({ value, label: value === "xray" ? "X-ray" : value.toUpperCase() }),
);
export function stateLabel(value: string) {
  return value.replaceAll("_", " ");
}
