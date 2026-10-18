"use client";
import { z } from "zod";
import { releasePayloadSchema } from "./schema";
import { ChartView } from "@/features/dental/chart-view";
import { DocumentPreview } from "@/features/documents/document-preview";
import { timeLabel, dateLabel } from "@/features/patients/feedback";

export function ReleaseView({
  payload,
  authorize,
}: {
  payload: z.infer<typeof releasePayloadSchema>;
  authorize?: (versionId: string) => Promise<string>;
}) {
  return (
    <div className="grid gap-8">
      <section>
        <h3 className="text-xl font-semibold">Care summary</h3>
        <p className="mt-3 max-w-prose leading-7 whitespace-pre-wrap">{payload.summary}</p>
      </section>
      {payload.encounters.map((item) => (
        <article key={item.id} className="grid gap-4 border-t border-border pt-6">
          <div>
            <h3 className="text-xl font-semibold">{item.reason}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {item.author} · {timeLabel(item.created_at)} · revision {item.version}
            </p>
          </div>
          {Object.entries(item.soap).map(([section, text]) => (
            <div key={section}>
              <h4 className="font-medium capitalize">{section}</h4>
              <p className="mt-2 max-w-prose leading-7 whitespace-pre-wrap">
                {text || "No text recorded."}
              </p>
            </div>
          ))}
          {!!item.diagnoses?.length && (
            <div>
              <h4 className="font-medium">Diagnoses and certainty</h4>
              <ul className="mt-2 grid gap-2">
                {item.diagnoses.map((value, index) => (
                  <li key={index} className="text-sm">
                    {value.description} · {value.certainty}
                    {value.code && ` · ${value.code}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!item.procedures?.length && (
            <div>
              <h4 className="font-medium">Procedures</h4>
              <ul className="mt-2 grid gap-2">
                {item.procedures.map((value, index) => (
                  <li key={index} className="text-sm">
                    {value.description} · {value.status.replaceAll("_", " ")}
                    {value.tooth && ` · Tooth ${value.tooth}`}
                    {!!value.surfaces.length && ` · ${value.surfaces.join(", ")}`}
                    {value.notes && <p className="mt-1 whitespace-pre-wrap">{value.notes}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      ))}
      {payload.chart && (
        <div className="border-t border-border pt-6">
          <p className="mb-4 text-xs text-muted-foreground">
            Chart as recorded {timeLabel(payload.chart.created_at)} · revision{" "}
            {payload.chart.version}
          </p>
          <ChartView findings={payload.chart.findings} />
        </div>
      )}
      {payload.plans.map((item) => (
        <section key={item.id} className="border-t border-border pt-6">
          <h3 className="text-xl font-semibold">{item.snapshot.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            As of {timeLabel(item.created_at)} · version {item.version} · {item.snapshot.completed}{" "}
            of {item.snapshot.active_total} active items completed
          </p>
          <ol className="mt-4 list-inside list-decimal space-y-3">
            {item.snapshot.items.map((value) => (
              <li key={value.id}>
                {value.description}
                {value.tooth && ` · Tooth ${value.tooth}`} · {value.status.replaceAll("_", " ")}
              </li>
            ))}
          </ol>
        </section>
      ))}
      {payload.follow_ups.map((item) => (
        <section key={item.id} className="border-t border-border pt-6">
          <h3 className="font-semibold">Follow-up</h3>
          <p className="mt-2 max-w-prose leading-7 whitespace-pre-wrap">
            {item.snapshot.instructions}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {item.snapshot.due_date
              ? `Review date ${dateLabel(item.snapshot.due_date)}`
              : "No review date set"}{" "}
            · {item.snapshot.status} · version {item.version} as of {timeLabel(item.created_at)}
          </p>
        </section>
      ))}
      {!!payload.documents.length && (
        <section className="grid gap-4 border-t border-border pt-6">
          <h3 className="text-xl font-semibold">Shared documents</h3>
          {payload.documents.map((item) => (
            <div key={item.id} className="grid gap-2">
              <p>
                {item.label} · version {item.version} · {Math.ceil(item.size / 1024)} KiB
              </p>
              {authorize && (
                <DocumentPreview
                  label={item.label}
                  contentType={item.content_type}
                  authorize={() => authorize(item.id)}
                />
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
