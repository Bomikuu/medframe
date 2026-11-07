import { z } from "zod";
import { requestWithCsrf } from "@/lib/auth/client";

const requestSchema = z.object({
  id: z.string(),
  version: z.number(),
  full_name: z.string(),
  date_of_birth: z.string(),
  sex: z.string(),
  email: z.string(),
  email_verified: z.boolean(),
  verified_mobile: z.string(),
  phone: z.string(),
  relationship: z.enum(["self", "guardian"]),
  contact_name: z.string(),
  created_at: z.string(),
  possible_duplicate: z.boolean(),
  matches: z.array(z.object({ id: z.string(), name: z.string(), reference: z.string() })),
});
export const reviewSchema = z.object({
  link: z.object({ url: z.string(), enabled: z.boolean() }).nullable(),
  pending_count: z.number(),
  has_more: z.boolean(),
  requests: z.array(requestSchema),
});
export type RegistrationReview = z.infer<typeof reviewSchema>;
export type RegistrationRequest = z.infer<typeof requestSchema>;
export function manageRegistration(
  organization_id: string,
  branch_id: string,
  action: string,
  values: Record<string, unknown> = {},
) {
  return requestWithCsrf<unknown>("portal/registration/manage", {
    organization_id,
    branch_id,
    action,
    ...values,
  });
}
