import Link from "next/link";
export default async function NoticePage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold">
        {kind === "terms" ? "Development-use terms" : "Development privacy notice"}
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Version development-2026-10-19 · Local development only
      </p>
      <div className="mt-8 space-y-5 text-sm leading-8">
        <p>
          This local Medframe environment is for evaluating the application with synthetic clinic
          and patient records. Do not use it for real clinical care or enter real patient
          information.
        </p>
        <p>
          Clinic setup information, account details and uploaded logos are stored by the local
          Django backend. Passwords use the existing Django authentication system; setup drafts do
          not contain passwords. Invitation and verification messages use the configured local mail
          service.
        </p>
        <p>
          Only the verified invitation recipient and authorized platform administrators can use the
          applicable onboarding controls. Clinical access remains governed by separate clinic
          memberships and patient permissions.
        </p>
        <p>
          These are development notices, not approved production legal terms. A production operator
          must provide approved Terms and Privacy content before offering the service to real
          clinics.
        </p>
      </div>
      <Link href="/onboarding/setup" className="mt-8 inline-block text-primary underline">
        Return to setup
      </Link>
    </main>
  );
}
