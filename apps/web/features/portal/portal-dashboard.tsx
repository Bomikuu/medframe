"use client";

import { PatientTaskHome } from "./patient-task-home";
import { EmptyState } from "@/components/application/empty-state";

import { RecordUnavailable } from "@/components/application/record-unavailable";
import { useClinicTime } from "@/components/application/clinical-locale";
import { useState } from "react";
import Link from "next/link";
import {
  PortalRecordsDocument,
  PortalRecordDocument,
  AuthorizePortalDownloadDocument,
} from "@/lib/graphql/portal/generated";
import { getPortalClient } from "@/lib/graphql/portal/client";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState } from "@/features/patients/feedback";
import { recordPage } from "@/features/records/schema";
import { PageControls } from "@/features/records/record-filters";
import { usePortal } from "./portal-provider";
import { releaseRowSchema, releasePayloadSchema } from "./schema";
import { ReleaseView } from "./release-view";
export function PortalDashboard() {
  const timeLabel = useClinicTime();
  const { linkId, href } = usePortal();
  const [after, setAfter] = useState<string>();
  const remote = useRemote(PortalRecordsDocument, { linkId, after }, { client: getPortalClient });
  const parsed = recordPage(releaseRowSchema).safeParse(remote.data?.portalRecords);
  return (
    <div className="grid gap-8">
      <PatientTaskHome key={linkId} />
      <section className="grid gap-5">
        <header>
          <h2 className="text-xl font-semibold">Shared care records</h2>
          <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
            Records reviewed and shared by your clinician.
          </p>
        </header>
        {!remote.data ? (
          <LoadState error={remote.error} retry={remote.reload} />
        ) : parsed.success ? (
          <>
            {!parsed.data.items.length && (
              <EmptyState
                illustration="medical-records"
                title="No records shared yet"
                description="Your connection is active. Records appear after your clinician reviews and publishes them."
              />
            )}
            <ul className="grid gap-4 lg:grid-cols-2">
              {parsed.data.items.map((item) => (
                <li key={item.id} className="rounded-xl border border-border bg-card p-5">
                  <Link
                    href={href(`/portal/records/${item.id}`)}
                    className="font-semibold text-primary hover:underline"
                  >
                    Release {item.sequence}
                  </Link>
                  <p className="mt-2 max-w-prose text-sm leading-6 whitespace-pre-wrap">
                    {item.summary}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.author} · {timeLabel(item.created_at)}
                  </p>
                </li>
              ))}
            </ul>
            <PageControls after={after} next={parsed.data.end_cursor} onChange={setAfter} />
          </>
        ) : (
          <RecordUnavailable
            title="Shared records are unavailable"
            description="We couldn’t read your released records. Try again, or contact your clinic if the problem continues."
            retry={remote.reload}
          />
        )}
      </section>
    </div>
  );
}
export function PortalRecord({ releaseId }: { releaseId: string }) {
  const timeLabel = useClinicTime();
  const { linkId, href } = usePortal();
  const remote = useRemote(
    PortalRecordDocument,
    { linkId, releaseId },
    { client: getPortalClient },
  );
  const parsed = releaseRowSchema
    .extend({ payload: releasePayloadSchema })
    .safeParse(remote.data?.portalRecord);
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  if (!parsed.success)
    return (
      <RecordUnavailable description="This released record could not be read. Contact your clinic administrator if the problem continues." />
    );
  return (
    <article className="grid gap-7">
      <Link href={href("/portal")} className="text-sm text-primary underline">
        All shared records
      </Link>
      <div>
        <h2 className="text-2xl font-semibold">Care release {parsed.data.sequence}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Published {timeLabel(parsed.data.created_at)} by {parsed.data.author}
        </p>
      </div>
      <ReleaseView
        payload={parsed.data.payload}
        authorize={async (versionId) => {
          const result = await getPortalClient().request(AuthorizePortalDownloadDocument, {
            linkId,
            releaseId,
            versionId,
          });
          return `/api/backend/portal/documents/download?ticket=${encodeURIComponent(result.authorizePortalDownload)}`;
        }}
      />
    </article>
  );
}
