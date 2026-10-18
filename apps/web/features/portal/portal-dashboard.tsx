"use client";
import { useState } from "react";
import Link from "next/link";
import {
  PortalRecordsDocument,
  PortalRecordDocument,
  AuthorizePortalDownloadDocument,
} from "@/lib/graphql/portal/generated";
import { getPortalClient } from "@/lib/graphql/portal/client";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState, timeLabel } from "@/features/patients/feedback";
import { recordPage } from "@/features/records/schema";
import { PageControls } from "@/features/records/record-filters";
import { usePortal } from "./portal-provider";
import { releaseRowSchema, releasePayloadSchema } from "./schema";
import { ReleaseView } from "./release-view";
export function PortalDashboard() {
  const { linkId, href } = usePortal();
  const [after, setAfter] = useState<string>();
  const remote = useRemote(PortalRecordsDocument, { linkId, after }, { client: getPortalClient });
  const parsed = recordPage(releaseRowSchema).safeParse(remote.data?.portalRecords);
  return (
    <section className="grid gap-5">
      <h2 className="text-xl font-semibold">Shared care records</h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        Each release preserves the versions your clinician selected at that time.
      </p>
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : parsed.success ? (
        <>
          {!parsed.data.items.length && (
            <div className="rounded-lg border border-dashed border-border p-6">
              <h3 className="font-medium">No records shared yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your connection is active. Records appear after your clinician reviews and publishes
                them.
              </p>
            </div>
          )}
          <ul className="grid gap-4">
            {parsed.data.items.map((item) => (
              <li key={item.id} className="border-b border-border py-4">
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
        <p role="alert">Shared records could not be read.</p>
      )}
    </section>
  );
}
export function PortalRecord({ releaseId }: { releaseId: string }) {
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
  if (!parsed.success) return <p role="alert">This released record could not be read.</p>;
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
