"use client";
import { RecoveryState } from "@/components/application/recovery-state";
import { RecordUnavailable } from "@/components/application/record-unavailable";
import { SessionRecoveryOptions } from "@/features/auth/session-recovery";
import { ClinicalLocaleProvider } from "@/components/application/clinical-locale";
import { createContext, useState, useContext, useEffect, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { failureText } from "@/features/patients/feedback";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import {
  PortalSessionDocument,
  PortalWorkspaceDocument,
  SavePortalPreferencesDocument,
} from "@/lib/graphql/portal/generated";
import { getPortalClient } from "@/lib/graphql/portal/client";
import { requestWithCsrf } from "@/lib/auth/client";
import { useRemote } from "@/features/patients/use-remote";
import { useSafety } from "@/features/workspace/safety-provider";
import { useAppearanceTokens } from "@/features/branding/theme-provider";
import { FormSelect } from "@/features/patients/form-controls";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";
import { LoadState } from "@/features/patients/feedback";
import { portalLinkSchema, portalWorkspaceSchema } from "./schema";
const PortalContext = createContext<{ linkId: string; href: (path: string) => string } | null>(
  null,
);
export function usePortal() {
  const value = useContext(PortalContext);
  if (!value) throw new Error("PortalProvider required");
  return value;
}
export function PortalProvider({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const requested = params.get("link");
  const session = useRemote(PortalSessionDocument, {}, { client: getPortalClient });
  const parsed = z.array(portalLinkSchema).safeParse(session.data?.portalLinks);
  useEffect(() => {
    const interval = window.setInterval(session.reload, 30000);
    return () => window.clearInterval(interval);
  }, [session.reload]);
  if (!session.data)
    return (
      <main id="main" className="grid min-h-svh place-items-center px-5 py-8">
        <LoadState error={session.error} retry={session.reload} />
      </main>
    );
  if (!parsed.success)
    return (
      <main id="main" className="grid min-h-svh place-items-center px-5 py-8">
        <RecordUnavailable
          compact={false}
          title="Patient connections are unavailable"
          description="We couldn’t read the patient connections for this account. Try again, or contact your clinic if the problem continues."
          retry={session.reload}
        />
      </main>
    );
  const link =
    parsed.data.find((item) => item.id === requested) ?? (!requested ? parsed.data[0] : undefined);
  if (!link) return <NoPortalConnection />;
  return (
    <PortalWorkspace key={link.id} link={link} links={parsed.data}>
      {children}
    </PortalWorkspace>
  );
}
function PortalWorkspace({
  link,
  links,
  children,
}: {
  link: z.infer<typeof portalLinkSchema>;
  links: z.infer<typeof portalLinkSchema>[];
  children: ReactNode;
}) {
  const remote = useRemote(
    PortalWorkspaceDocument,
    { linkId: link.id },
    { client: getPortalClient },
  );
  const parsed = portalWorkspaceSchema.safeParse(remote.data?.portalWorkspace);
  useEffect(() => {
    const timer = window.setInterval(remote.reload, 30000);
    return () => window.clearInterval(timer);
  }, [remote.reload]);
  if (!remote.data)
    return (
      <main id="main" className="grid min-h-svh place-items-center px-5 py-8">
        <LoadState error={remote.error} retry={remote.reload} />
      </main>
    );
  if (!parsed.success)
    return (
      <main id="main" className="grid min-h-svh place-items-center px-5 py-8">
        <RecordUnavailable
          compact={false}
          title="Your patient workspace is unavailable"
          description="We couldn’t read your portal information. Try again, or contact your clinic if the problem continues."
          retry={remote.reload}
        />
      </main>
    );
  return (
    <PortalShell workspace={parsed.data} link={link} links={links} reload={remote.reload}>
      {children}
    </PortalShell>
  );
}
function PortalShell({
  workspace,
  link,
  links,
  children,
  reload,
}: {
  workspace: z.infer<typeof portalWorkspaceSchema>;
  link: z.infer<typeof portalLinkSchema>;
  links: z.infer<typeof portalLinkSchema>[];
  children: ReactNode;
  reload: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { guard } = useSafety();
  useAppearanceTokens(workspace.theme, { mode: workspace.mode, density: workspace.density });
  const href = (path: string) => `${path}?link=${encodeURIComponent(link.id)}`;
  return (
    <PortalContext.Provider value={{ linkId: link.id, href }}>
      <ClinicalLocaleProvider timezone={workspace.timezone}>
        <div className="min-h-dvh bg-background wrap-anywhere">
          <header className="border-b border-border bg-card">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-5">
              <div className="flex items-center gap-4">
                {workspace.logo_ticket && (
                  <Image
                    src={`/api/backend/portal/documents/download?ticket=${encodeURIComponent(workspace.logo_ticket)}`}
                    alt={`${workspace.clinic_name} logo`}
                    width={160}
                    height={60}
                    unoptimized
                    className="h-12 w-auto max-w-40 object-contain"
                  />
                )}
                <div>
                  <Brand />
                  <p className="mt-1 text-sm text-muted-foreground">
                    {workspace.clinic_name} · Patient portal
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void guard(() => router.push("/login"))}
                >
                  Staff sign in
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void guard(() => {
                      void requestWithCsrf("portal/auth/logout", {}).finally(() => {
                        router.replace("/portal/login");
                        router.refresh();
                      });
                    })
                  }
                >
                  Sign out
                </Button>
              </div>
            </div>
          </header>
          <main id="main" className="mx-auto grid max-w-6xl gap-6 px-5 py-7">
            <div className="flex flex-wrap items-end justify-between gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
              <div>
                <h1 className="text-2xl font-semibold">{workspace.patient_name}</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {workspace.reference} ·{" "}
                  {workspace.relationship === "guardian"
                    ? "Verified guardian access"
                    : "Your patient record"}
                </p>
              </div>
              {links.length > 1 && (
                <FormSelect
                  id="portal-relationship"
                  label="Patient connection"
                  personKind="patient"
                  value={link.id}
                  onChange={(value) =>
                    void guard(() => router.push(`/portal?link=${encodeURIComponent(value)}`))
                  }
                  options={links.map((item) => ({
                    value: item.id,
                    label: `${item.patient_name} · ${item.clinic_name} · ${item.relationship}`,
                  }))}
                />
              )}
            </div>
            <nav
              aria-label="Patient navigation"
              className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 text-sm font-medium [&>a]:flex [&>a]:min-h-11 [&>a]:shrink-0 [&>a]:items-center [&>a]:rounded-lg [&>a]:px-4 [&>a:hover]:bg-surface-hover [&>a[aria-current=page]]:bg-teal-soft [&>a[aria-current=page]]:text-teal-ink"
            >
              <Link
                aria-current={pathname === "/portal" ? "page" : undefined}
                href={href("/portal")}
                className="text-primary hover:underline"
              >
                Home
              </Link>
              <Link
                href={href("/portal/appointments")}
                aria-current={pathname === "/portal/appointments" ? "page" : undefined}
                className="text-primary hover:underline"
              >
                My appointments
              </Link>
              <Link
                href={href("/portal/reminders")}
                aria-current={pathname === "/portal/reminders" ? "page" : undefined}
              >
                Reminders
              </Link>
              <Link
                href={href("/portal/billing")}
                aria-current={pathname === "/portal/billing" ? "page" : undefined}
              >
                Billing
              </Link>
              <Link
                href={href("/portal/diagnostics")}
                className="px-4 py-3 text-sm font-medium"
                aria-current={pathname.startsWith("/portal/diagnostics") ? "page" : undefined}
              >
                Diagnostics
              </Link>
              <Link
                href={href("/portal/queue")}
                aria-current={pathname === "/portal/queue" ? "page" : undefined}
                className="text-primary hover:underline"
              >
                My queue
              </Link>
              <Link
                aria-current={pathname === "/portal/reports" ? "page" : undefined}
                href={href("/portal/reports")}
                className="text-primary hover:underline"
              >
                My reports
              </Link>
            </nav>
            <div
              key={link.id}
              className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              {children}
            </div>
            <details className="border-t border-border pt-5">
              <summary className="min-h-11 text-sm font-medium">Display preferences</summary>
              <PortalPreferences
                key={workspace.preferences_version}
                workspace={workspace}
                reload={reload}
              />
            </details>
            <p className="border-t border-border pt-5 text-xs leading-6 text-muted-foreground">
              This portal displays records your clinic explicitly released. Contact your clinic
              about missing records or corrections.
            </p>
          </main>
        </div>
      </ClinicalLocaleProvider>
    </PortalContext.Provider>
  );
}
function PortalPreferences({
  workspace,
  reload,
}: {
  workspace: z.infer<typeof portalWorkspaceSchema>;
  reload: () => void;
}) {
  const { linkId } = usePortal();
  const form = useForm({ defaultValues: { mode: workspace.mode, density: workspace.density } });
  const watchedForm = useWatch({ control: form.control });
  const [error, setError] = useState<unknown>(null);
  const capture = useRequestScope();
  return (
    <form
      noValidate
      className="grid max-w-xl gap-4 sm:grid-cols-3"
      onSubmit={form.handleSubmit(async (values) => {
        const current = capture();
        setError(null);
        try {
          await getPortalClient().request(SavePortalPreferencesDocument, {
            linkId,
            ...values,
            expectedVersion: workspace.preferences_version,
          });
          if (current()) reload();
        } catch (failure) {
          if (current()) setError(failure);
        }
      })}
    >
      <FormSelect
        id="portal-mode"
        label="Color mode"
        value={watchedForm.mode ?? ""}
        onChange={(value) => form.setValue("mode", value as typeof workspace.mode)}
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "system", label: "System" },
        ]}
      />
      <FormSelect
        id="portal-density"
        label="Density"
        value={watchedForm.density ?? ""}
        onChange={(value) => form.setValue("density", value as typeof workspace.density)}
        options={[
          { value: "inherit", label: "Clinic default" },
          { value: "comfortable", label: "Comfortable" },
          { value: "compact", label: "Compact" },
        ]}
      />
      <Button className="self-end" disabled={form.formState.isSubmitting}>
        Save display preferences
      </Button>
      {error !== null && (
        <p role="alert" className="sm:col-span-3">
          {failureText(error)}
        </p>
      )}
    </form>
  );
}

function NoPortalConnection() {
  const { clearDirty } = useSafety();
  useEffect(() => {
    clearDirty();
  }, [clearDirty]);
  return (
    <main id="main" className="grid min-h-svh place-items-center px-5 py-8">
      <RecoveryState
        level={1}
        title="No active patient connection"
        description="You’re signed in, but this account has no active patient-portal connection. Contact your clinic to verify your identity or restore access."
      >
        <SessionRecoveryOptions showWorkspace={false} />
      </RecoveryState>
    </main>
  );
}
