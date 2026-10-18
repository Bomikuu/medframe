"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { PasswordInput } from "@/components/password-input";
import { loginSchema, type LoginValues } from "@/lib/auth/schemas";

export function LoginForm({
  onSubmit,
  busy,
  portal = false,
}: {
  onSubmit: (values: LoginValues) => Promise<void>;
  busy: boolean;
  portal?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
      <FormField
        id="email"
        label={portal ? "Account email" : "Work email"}
        error={errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          placeholder="you@yourclinic.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-help" : undefined}
          {...register("email")}
        />
      </FormField>
      <FormField id="password" label="Password" error={errors.password?.message}>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-help" : undefined}
          {...register("password")}
        />
      </FormField>
      <Link
        href={portal ? "/portal/recover" : "/auth/recover"}
        className="-mt-2 justify-self-end text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Forgot password?
      </Link>
      <Button type="submit" disabled={busy} aria-busy={busy} className="mt-1 w-full">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
