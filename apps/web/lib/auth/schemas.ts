import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address.").max(320),
  password: z.string().min(1, "Enter your password.").max(256),
  remember: z.boolean(),
});
export const codeSchema = z.object({
  code: z.string().trim().min(6, "Enter your authenticator or recovery code.").max(32),
});
export const newPasswordSchema = z.object({
  password: z
    .string()
    .refine((value) => Array.from(value).length >= 15 && Array.from(value).length <= 128, {
      message: "Use 15 to 128 characters.",
    }),
});
export type LoginValues = z.infer<typeof loginSchema>;
export type CodeValues = z.infer<typeof codeSchema>;
