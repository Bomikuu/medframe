"use client";

import { Controller, useForm } from "react-hook-form";
import { PhoneInput } from "@/components/application/phone-input";
import { phoneError } from "@/lib/contact-format";
import { ArrowRight, LoaderCircle, MailCheck } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/features/patients/form-controls";
import type { PatientDetails } from "./registration-client";

export function RegistrationDetails({
  email,
  verifiedPhone = "",
  busy,
  onSubmit,
}: {
  email: string;
  verifiedPhone?: string;
  busy: boolean;
  onSubmit: (details: PatientDetails) => Promise<void>;
}) {
  const form = useForm<PatientDetails>({
    defaultValues: {
      email: "",
      full_name: "",
      date_of_birth: "",
      sex: "not_recorded",
      phone: verifiedPhone,
      relationship: "self",
      contact_name: "",
    },
  });
  const relationship = form.watch("relationship");
  const errors = form.formState.errors;
  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-start gap-2 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900 dark:bg-teal-950 dark:text-teal-100">
        <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-all">
          {verifiedPhone ? `Mobile verified: ${verifiedPhone}` : `Email verified: ${email}`}
        </span>
      </div>
      {verifiedPhone && (
        <FormField
          id="registration-portal-email"
          label="Email for your portal invitation"
          hint="Your clinic will send the access link here after acceptance. This email has not yet been verified."
          error={errors.email?.message}
        >
          <Input
            id="registration-portal-email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            aria-required
            {...form.register("email", {
              required: "Enter an email for your portal invitation.",
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email." },
            })}
          />
        </FormField>
      )}
      <FormSelect
        id="registration-relationship"
        label="Who are you registering?"
        value={relationship}
        onChange={(value) => form.setValue("relationship", value as "self" | "guardian")}
        options={[
          { value: "self", label: "Myself" },
          { value: "guardian", label: "A child or someone I am the guardian of" },
        ]}
      />
      {relationship === "guardian" && (
        <FormField
          id="registration-guardian"
          label="Your full name"
          error={errors.contact_name?.message}
        >
          <Input
            id="registration-guardian"
            autoComplete="name"
            maxLength={160}
            {...form.register("contact_name", {
              validate: (value) =>
                relationship !== "guardian" || !!value.trim() || "Enter your name as the guardian.",
            })}
          />
        </FormField>
      )}
      <FormField
        id="registration-name"
        label="Patient’s full name"
        error={errors.full_name?.message}
      >
        <Input
          id="registration-name"
          autoComplete={relationship === "self" ? "name" : "off"}
          maxLength={160}
          aria-required
          {...form.register("full_name", {
            validate: (value) => value.trim().length >= 2 || "Enter the patient’s full name.",
          })}
        />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="registration-birth"
          label="Date of birth (optional)"
          error={errors.date_of_birth?.message}
        >
          <Input
            id="registration-birth"
            type="date"
            autoComplete={relationship === "self" ? "bday" : "off"}
            {...form.register("date_of_birth")}
          />
        </FormField>
        <FormSelect
          id="registration-sex"
          label="Sex (optional)"
          value={form.watch("sex")}
          onChange={(value) => form.setValue("sex", value)}
          options={[
            { value: "not_recorded", label: "Prefer not to say" },
            { value: "female", label: "Female" },
            { value: "male", label: "Male" },
            { value: "intersex", label: "Intersex" },
          ]}
        />
      </div>
      <FormField
        id="registration-phone"
        label="Patient phone (optional)"
        hint="Philippines uses +63. Enter the number without its leading 0."
        error={errors.phone?.message}
      >
        <Controller
          name="phone"
          control={form.control}
          rules={{ validate: (value) => phoneError(value) ?? true }}
          render={({ field }) => (
            <PhoneInput
              {...field}
              id="registration-phone"
              onValueChange={field.onChange}
              aria-invalid={!!errors.phone}
              aria-describedby="registration-phone-help"
            />
          )}
        />
      </FormField>
      <p className="text-xs leading-6 text-muted-foreground">
        Your clinic will review these details and check for an existing record. Submitting this form
        does not create portal access.{" "}
        {relationship === "guardian" && "The clinic will also verify your authority as guardian."}
      </p>
      <Button type="submit" disabled={busy} className="w-full" aria-busy={busy}>
        {busy ? (
          <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <ArrowRight aria-hidden="true" />
        )}
        {busy ? "Submitting…" : "Submit for clinic review"}
      </Button>
    </form>
  );
}
