import Link from "next/link";
import { Brand } from "@/components/brand";
export function PortalAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main"
      className="mx-auto grid min-h-dvh max-w-lg content-start gap-10 px-6 py-12 sm:py-20"
    >
      <Link href="/portal/login">
        <Brand />
      </Link>
      {children}
      <p className="border-t border-border pt-5 text-sm text-muted-foreground">
        Patient access starts with a clinic-verified invitation. Contact your clinic if you need
        access.
      </p>
      <Link className="text-sm text-primary underline" href="/login">
        Staff sign in
      </Link>
    </main>
  );
}
