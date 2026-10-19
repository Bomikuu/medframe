"use client";

import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/form-field";
import { PasswordInput } from "@/components/password-input";
import { loginSchema, type LoginValues } from "@/lib/auth/schemas";
import { GoogleSignIn } from "./google-sign-in";

export function LoginForm({
  onSubmit,
  onGoogleSubmit,
  busy,
  portal = false,
  sharedDevice = false,
}: {
  onSubmit: (values: LoginValues) => Promise<void>;
  onGoogleSubmit: (credential: string, remember: boolean) => Promise<void>;
  busy: boolean;
  portal?: boolean;
  sharedDevice?: boolean;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });
  const remember = useWatch({ control, name: "remember" });
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
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <label
            htmlFor="remember"
            className={
              sharedDevice ? "hidden" : "flex min-h-8 cursor-pointer items-center gap-2 text-sm"
            }
          >
            <Controller
              name="remember"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="remember"
                  name={field.name}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  disabled={busy}
                  aria-describedby="remember-help"
                />
              )}
            />
            Stay logged in
          </label>
          <Link
            href={portal ? "/portal/recover" : "/auth/recover"}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <p
          id="remember-help"
          hidden={sharedDevice}
          className="text-xs leading-5 text-muted-foreground"
        >
          Stay signed in on this browser for up to 30 days. The 30-minute inactivity limit still
          applies.
        </p>
      </div>
      <Button type="submit" disabled={busy} aria-busy={busy} className="mt-1 w-full">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <GoogleSignIn
        portal={portal}
        busy={busy}
        remember={sharedDevice ? false : remember}
        onSubmit={onGoogleSubmit}
      />
    </form>
  );
}
