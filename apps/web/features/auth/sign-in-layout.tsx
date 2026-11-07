import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/brand";

/** Shared entry surface; recovery and invitation pages keep their existing layouts. */
export function SignInLayout({
  children,
  portal = false,
}: {
  children: ReactNode;
  portal?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main
        id="main"
        className="mx-auto flex w-full max-w-[472px] flex-1 flex-col justify-center gap-6 px-4 py-8 sm:py-12"
      >
        <Link
          href={portal ? "/portal/login" : "/login"}
          aria-label={portal ? "Medframe patient sign in" : "Medframe provider sign in"}
          className="mx-auto inline-flex rounded-lg outline-offset-4"
        >
          <Brand />
        </Link>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--panel-shadow)] sm:p-8">
          {children}
        </div>
        <div className="grid justify-items-center gap-2 px-2 text-center">
          <p className="max-w-sm text-xs leading-5 text-muted-foreground">
            {portal
              ? "New patient? Register using your clinic’s link. Your clinic reviews registration before granting portal access."
              : "Your clinic administrator provides your staff account."}
          </p>
          <Link
            href={portal ? "/login" : "/portal/login"}
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {portal ? "Provider & staff sign in" : "Patient portal sign in"}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
