import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-5 py-5 sm:px-10">
        <Link href="/login" aria-label="Medframe sign in">
          <Brand />
        </Link>
        <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <ShieldCheck className="size-4" />
          Clinical workspace
        </span>
      </header>
      <main
        id="main"
        className="flex w-full flex-1 flex-col items-center justify-center px-4 py-10 sm:py-14"
      >
        <div className="w-full max-w-[440px] rounded-xl border border-border bg-card p-6 sm:p-8">
          {children}
        </div>
        <p className="mt-6 max-w-sm text-center text-xs leading-6 text-muted-foreground">
          Staff accounts are provided by your clinic administrator.
          <br />
          <Link
            href="/portal/login"
            className="font-medium text-primary underline underline-offset-4"
          >
            Patient portal sign in
          </Link>
        </p>
      </main>
      <footer className="px-5 pb-6 text-center text-xs text-muted-foreground">
        The Foundation of Modern Care.
      </footer>
    </div>
  );
}
