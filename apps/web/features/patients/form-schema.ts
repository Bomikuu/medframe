import { z } from "zod";
import type { PatientDetailsFragment } from "@/lib/graphql/generated";

const optionalName = z.string().max(160, "Use 160 characters or fewer.");
const phone = z.string().max(40, "Use 40 characters or fewer.");
export const patientSchema = z.object({
  branchId: z.uuid("Choose an authorized branch."),
  expectedVersion: z.number().int().min(1),
  requestId: z.string(),
  fullName: z
    .string()
    .trim()
    .min(1, "Enter the patient’s full name.")
    .max(160, "Use 160 characters or fewer."),
  dateOfBirth: z.string().refine(
    (value) =>
      !value ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        value <=
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date())),
    "Enter a valid birth date that is not in the future.",
  ),
  sex: z.enum(["not_recorded", "female", "male", "intersex"]),
  email: z
    .union([z.literal(""), z.email("Enter a valid email address.")])
    .refine((value) => value.length <= 254, "Use 254 characters or fewer."),
  phone,
  address: z.string().max(500, "Use 500 characters or fewer."),
  emergencyContactName: optionalName,
  emergencyContactPhone: phone,
  emergencyContactRelationship: optionalName,
  guardianName: optionalName,
  guardianPhone: phone,
  guardianRelationship: optionalName,
});
export type PatientFormValues = z.infer<typeof patientSchema>;
export function patientDefaults(patient?: PatientDetailsFragment): PatientFormValues {
  return {
    branchId: patient?.branchId ?? "",
    expectedVersion: patient?.version ?? 1,
    requestId: "",
    fullName: patient?.fullName ?? "",
    dateOfBirth: patient?.dateOfBirth ?? "",
    sex: (patient?.sex as PatientFormValues["sex"]) ?? "not_recorded",
    email: patient?.email ?? "",
    phone: patient?.phone ?? "",
    address: patient?.address ?? "",
    emergencyContactName: patient?.emergencyContactName ?? "",
    emergencyContactPhone: patient?.emergencyContactPhone ?? "",
    emergencyContactRelationship: patient?.emergencyContactRelationship ?? "",
    guardianName: patient?.guardianName ?? "",
    guardianPhone: patient?.guardianPhone ?? "",
    guardianRelationship: patient?.guardianRelationship ?? "",
  };
}
