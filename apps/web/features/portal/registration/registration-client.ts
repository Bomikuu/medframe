import { z } from "zod";
import { requestWithCsrf } from "@/lib/auth/client";

export const applicationSchema = z.object({
  state: z.enum(["pending", "accepted", "declined"]),
  reference: z.string(),
});
export const registrationBootSchema = z.object({
  clinic: z.string(),
  branch: z.string(),
  email_verified: z.boolean(),
  contact_verified: z.boolean(),
  channel: z.enum(["email", "mobile", "google"]),
  phone: z.string(),
  email: z.string(),
  application: applicationSchema.nullable(),
  mobile_available: z.boolean(),
});
export type RegistrationBoot = z.infer<typeof registrationBootSchema>;
export type ApplicationStatus = z.infer<typeof applicationSchema>;
export type PatientDetails = {
  email: string;
  full_name: string;
  date_of_birth: string;
  sex: string;
  phone: string;
  relationship: "self" | "guardian";
  contact_name: string;
};
export function registrationRequest(
  token: string,
  action: string,
  values: Record<string, unknown> = {},
) {
  return requestWithCsrf<unknown>("portal/registration", { token, action, ...values });
}
