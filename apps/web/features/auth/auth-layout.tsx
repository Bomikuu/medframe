import type { ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/brand";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(320px,0.85fr)_1.15fr]">
      <aside className="hidden flex-col justify-between border-r border-border bg-muted/40 p-12 lg:flex xl:p-16">
        <Link href="/login" aria-label="Medframe sign in">
          <Brand />
        </Link>
        <div className="max-w-md py-16">
          <div className="mb-8 h-1 w-12 rounded-full bg-primary" />
          <h1 className="text-4xl leading-tight font-semibold tracking-tight text-foreground xl:text-5xl">
            A focused space
            <br />
            for patient care.
          </h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-muted-foreground">
            Your clinical workspace starts with a secure connection to your clinic.
          </p>
          <dl className="mt-12 grid gap-7 border-t border-border pt-8 text-sm">
            <div>
              <dt className="font-medium">Your identity, verified</dt>
              <dd className="mt-1 leading-6 text-muted-foreground">
                An authenticator protects every staff sign-in.
              </dd>
            </div>
            <div>
              <dt className="font-medium">The right access</dt>
              <dd className="mt-1 leading-6 text-muted-foreground">
                Only the organizations assigned to your account.
              </dd>
            </div>
          </dl>
        </div>
        <p className="text-sm text-muted-foreground">The Foundation of Modern Care.</p>
      </aside>
      <main id="main" className="flex min-w-0 flex-col px-6 py-8 sm:px-12 lg:px-16">
        <div className="mb-12 lg:hidden">
          <Brand />
        </div>
        <div className="my-auto w-full max-w-md self-center py-8">{children}</div>
        <p className="mt-10 text-center text-xs leading-5 text-muted-foreground">
          Staff access only. Contact your clinic administrator for an account.{" "}
          <Link href="/portal/login" className="ml-1 text-primary underline">
            Patient portal sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
