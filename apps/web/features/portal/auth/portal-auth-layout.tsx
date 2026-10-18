import Link from "next/link";
import { Brand } from "@/components/brand";
export function PortalAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="border-b border-border bg-card px-5 py-5 sm:px-10">
        <Link href="/portal/login" aria-label="Medframe patient portal">
          <Brand />
        </Link>
      </header>
      <main
        id="main"
        className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center gap-6 px-4 py-10"
      >
        <div className="grid gap-5 rounded-xl border border-border bg-card p-6 sm:p-8">
          {children}
        </div>
        <p className="text-center text-xs leading-6 text-muted-foreground">
          Patient access starts with a clinic-verified invitation.
          <br />
          Contact your clinic if you need access.
        </p>
        <Link
          className="text-center text-sm text-primary underline underline-offset-4"
          href="/login"
        >
          Staff sign in
        </Link>
      </main>
    </div>
  );
}
