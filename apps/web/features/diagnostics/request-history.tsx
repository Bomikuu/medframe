"use client";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { DiagnosticHistoryDocument } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState } from "@/features/patients/feedback";
import { resultSchema, stateLabel } from "./schema";
import { DiagnosticResultView } from "./result-view";
const historySchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      action: z.string(),
      reason: z.string(),
      author: z.string(),
      created_at: z.string(),
    }),
  ),
  has_next_page: z.boolean(),
  end_cursor: z.string().nullable(),
});
const resultsSchema = z.object({
  items: z.array(resultSchema),
  has_next_page: z.boolean(),
  end_cursor: z.string().nullable(),
});
export function DiagnosticHistory({ id, context }: { id: string; context: "clinic" | "center" }) {
  const { organizationId } = useWorkspace();
  const [kind, setKind] = useState("events");
  const [after, setAfter] = useState<string | null>(null);
  const remote = useRemote(DiagnosticHistoryDocument, {
    organizationId,
    requestId: id,
    context,
    kind,
    after,
  });
  const events = historySchema.safeParse(remote.data?.diagnosticHistory);
  const results = resultsSchema.safeParse(remote.data?.diagnosticHistory);
  const page = kind === "events" ? events : results;
  return (
    <section className="grid gap-4 border-t border-border pt-6">
      <div className="flex flex-wrap gap-3">
        <Button
          variant={kind === "events" ? "default" : "outline"}
          onClick={() => {
            setKind("events");
            setAfter(null);
          }}
        >
          Activity
        </Button>
        <Button
          variant={kind === "results" ? "default" : "outline"}
          onClick={() => {
            setKind("results");
            setAfter(null);
          }}
        >
          Result versions
        </Button>
      </div>
      {!page.success ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : (
        <>
          <div className="grid gap-6">
            {kind === "events" &&
              events.success &&
              events.data.items.map((item) => (
                <div key={item.id} className="border-b border-border pb-4">
                  <p className="font-medium capitalize">{stateLabel(item.action)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.author} · {new Date(item.created_at).toLocaleString()}
                  </p>
                  {item.reason && <p className="mt-2 text-sm">{item.reason}</p>}
                </div>
              ))}
            {kind === "results" &&
              results.success &&
              results.data.items.map((result) => (
                <DiagnosticResultView
                  key={result.id}
                  result={result}
                  requestId={id}
                  context={context}
                />
              ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" disabled={!after} onClick={() => setAfter(null)}>
              Newest
            </Button>
            <Button
              variant="outline"
              disabled={!page.data.has_next_page}
              onClick={() => setAfter(page.data.end_cursor)}
            >
              Older
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
