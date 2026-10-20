import { z } from "zod";

export const profileSummarySchema = z.object({
  timezone: z.string(),
  clinical: z
    .object({
      count: z.number(),
      portrait_id: z.string().nullable(),
      recent: z.array(
        z.object({
          id: z.string(),
          reason: z.string(),
          status: z.string(),
          provider_name: z.string(),
          created_at: z.string(),
          updated_at: z.string(),
        }),
      ),
    })
    .nullable(),
  operations: z
    .object({
      appointment_count: z.number(),
      visit_count: z.number(),
      upcoming: z.array(
        z.object({ id: z.string(), start: z.string(), status: z.string(), provider: z.string() }),
      ),
    })
    .nullable(),
  financial: z
    .object({
      balances: z.array(
        z.object({
          currency: z.string(),
          outstanding: z.string(),
          unpaid_count: z.number(),
          due_now: z.string().optional(),
          overdue: z.string().optional(),
          future: z.string().optional(),
        }),
      ),
    })
    .nullable(),
});
export type ProfileSummary = z.infer<typeof profileSummarySchema>;
export type ProfileConsultation = NonNullable<ProfileSummary["clinical"]>["recent"][number];

export function currencyLabel(value: string, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value));
}

export function ageLabel(dateOfBirth: string | null, timezone: string) {
  if (!dateOfBirth) return null;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (name: Intl.DateTimeFormatPartTypes) =>
    Number(today.find((item) => item.type === name)?.value);
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const years =
    part("year") -
    year -
    (part("month") < month || (part("month") === month && part("day") < day) ? 1 : 0);
  return years >= 0 ? `${years} years old` : null;
}
