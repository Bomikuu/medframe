"use client";
import { useId, useState } from "react";
import {
  Bot,
  X,
  SendHorizontal,
  Paperclip,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type ClinicalAssistantContext = {
  domain: "dental" | "anatomy";
  title: string;
  detail?: string;
  findingCount: number;
};

export function ClinicalAssistantPreview({
  onClose,
  context,
}: {
  onClose: () => void;
  context: ClinicalAssistantContext;
}) {
  const [draft, setDraft] = useState("");
  const composerId = useId();
  const suggestions = [
    `Explain ${context.title.toLowerCase()}`,
    `Summarize findings for ${context.title.toLowerCase()}`,
    "Prepare follow-up questions",
  ];
  return (
    <div className="flex h-full min-h-0 flex-col" aria-label="Medframe AI preview">
      <header className="relative z-10 flex shrink-0 items-start gap-3 border-b border-border bg-card p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <span className="bg-teal-wash grid size-10 shrink-0 place-items-center rounded-xl border border-teal-ink/15 text-teal-ink">
          <Bot className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">Medframe AI</h2>
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Preview
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Your clinical assistant workspace</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          aria-label="Close AI sidebar"
          title="Return to the clinical editor"
          onClick={onClose}
        >
          <X />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6">
        <div className="flex items-start gap-3">
          <Bot className="mt-2 size-5 shrink-0 text-teal-ink" />
          <div className="rounded-xl rounded-tl-sm border border-border/60 bg-muted/45 p-4 text-sm leading-6">
            <p className="font-medium">A little more context, right beside your chart.</p>
            <p className="mt-2 text-muted-foreground">
              This space is being prepared for questions about your focused{" "}
              {context.domain === "dental" ? "tooth" : "structure"} and clinical workflow.
            </p>
            <p className="mt-3 text-xs font-medium text-teal-ink">
              AI is not connected yet. No answers are generated.
            </p>
          </div>
        </div>
        <section aria-label="Assistant focus" className="mt-5 border-y border-border py-4">
          <p className="text-xs text-muted-foreground">Current focus</p>
          <p className="mt-1 text-sm font-semibold">{context.title}</p>
          {context.detail && <p className="mt-1 text-xs text-muted-foreground">{context.detail}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            {context.findingCount} recorded finding{context.findingCount === 1 ? "" : "s"} · local
            preview
          </p>
        </section>
        <div className="mt-8 grid gap-2">
          <p className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5" />
            Try the composer preview
          </p>
          {suggestions.map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => setDraft(value)}
              className="hover:bg-teal-wash/50 flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left text-xs leading-5 transition-colors hover:border-teal-ink/30"
            >
              <span>{value}</span>
              <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
        <div className="mt-8 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <p>
            Preview text stays in this panel. Nothing is sent, saved as a message, or added to the
            patient record.
          </p>
        </div>
      </div>
      <div className="shrink-0 border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <label htmlFor={composerId} className="sr-only">
          AI message preview
        </label>
        <div className="rounded-xl border border-input/60 bg-background p-2 shadow-sm">
          <Textarea
            id={composerId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask a follow-up question…"
            maxLength={2000}
            rows={3}
            className="min-h-20 resize-none border-0 bg-transparent px-2 py-1 text-sm shadow-none focus-visible:ring-0"
          />
          <div className="mt-1 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled
              aria-label="Attach file — unavailable in preview"
            >
              <Paperclip />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              disabled
              aria-label="Send message — AI is not connected"
            >
              <SendHorizontal />
            </Button>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Interface preview · sending is unavailable
        </p>
      </div>
    </div>
  );
}
