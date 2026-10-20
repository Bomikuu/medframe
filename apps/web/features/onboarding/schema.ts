import { z } from "zod";
export const steps = [
  "clinic",
  "specialties",
  "branding",
  "practice",
  "account",
  "review",
] as const;
export type Step = (typeof steps)[number];
export const titles: Record<Step, string> = {
  clinic: "Clinic information",
  specialties: "Medical specialties",
  branding: "Make it your own",
  practice: "Practice details",
  account: "Your administrator account",
  review: "Review & confirm",
};
export const snapshotSchema = z.object({
  id: z.string(),
  version: z.number(),
  current_step: z.enum(steps),
  completed_steps: z.array(z.string()),
  status: z.string(),
  intro_status: z.string(),
  data: z.record(z.string(), z.record(z.string(), z.unknown())),
  email: z.string(),
  contact_name: z.string(),
  administrator_name: z.string().nullable().optional(),
  account_ready: z.boolean(),
  last_saved_at: z.string(),
  logo: z
    .object({ id: z.string(), state: z.string(), width: z.number(), height: z.number() })
    .nullable(),
  completion: z
    .object({
      organization_id: z.string(),
      branch_id: z.string(),
      membership_id: z.string(),
      completed_at: z.string(),
    })
    .nullable(),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export const bootstrapSchema = z.object({
  status: z.string(),
  masked_email: z.string(),
  intro_status: z.string(),
  verified: z.boolean(),
});
export const referencesSchema = z.object({
  specialties: z.array(z.object({ code: z.string(), name: z.string(), category: z.string() })),
  clinicTypes: z.array(z.object({ value: z.string(), label: z.string() })),
  presets: z.array(
    z.object({ name: z.string(), primary: z.string(), secondary: z.string(), accent: z.string() }),
  ),
});
export type References = z.infer<typeof referencesSchema>;
export type Fields = Record<string, unknown>;
export function stepValidation(step: Step) {
  return z.record(z.string(), z.unknown()).superRefine((data, context) => {
    const fail = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });
    if (step === "clinic") {
      if (typeof data.name !== "string" || !data.name.trim())
        fail("name", "Enter your clinic name.");
      if (!z.string().email().safeParse(data.email).success)
        fail("email", "Enter a valid clinic email.");
      if (!/^\+[0-9]{7,15}$/.test(String(data.phone)))
        fail("phone", "Include a country prefix and 7–15 digits.");
    }
    if (step === "specialties") {
      if (!Array.isArray(data.codes) || !data.codes.length)
        fail("codes", "Choose at least one specialty.");
      if (!Array.isArray(data.provider_types) || !data.provider_types.length)
        fail("provider_types", "Choose a provider type.");
    }
    if (step === "branding")
      for (const key of ["primary", "secondary", "accent"])
        if (!/^#[0-9a-f]{6}$/i.test(String(data[key]))) fail(key, "Use a six-digit hex color.");
    if (step === "practice") {
      if (!String(data.branch_name ?? "").trim()) fail("branch_name", "Enter a branch name.");
      if (!Array.isArray(data.days) || !data.days.length) fail("days", "Choose an operating day.");
      if (String(data.opens) >= String(data.closes))
        fail("closes", "Closing time must follow opening time.");
      if (
        !Number.isInteger(data.duration_minutes) ||
        Number(data.duration_minutes) < 5 ||
        Number(data.duration_minutes) > 240
      )
        fail("duration_minutes", "Use 5–240 whole minutes.");
    }
  });
}
