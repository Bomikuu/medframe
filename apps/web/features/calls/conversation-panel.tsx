"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  ArrowDown,
  Download,
  FileText,
  FileUp,
  LoaderCircle,
  MessageSquare,
  Paperclip,
  Send,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { CallState, CallMessage } from "./client";
import { cn } from "@/lib/utils";
import { callTime, messageDay, fileSize } from "./call-format";

type Task = "send" | "upload" | "history" | null;
export type ConversationPanelProps = {
  state: CallState;
  messages: CallMessage[];
  tab: "chat" | "files";
  setTab: (tab: "chat" | "files") => void;
  body: string;
  setBody: (value: string) => void;
  task: Task;
  error: string;
  notice: string;
  moreHistory: boolean;
  canRetry: boolean;
  send: () => void;
  upload: (file: File) => void;
  history: () => void;
  retry: () => void;
};
export function ConversationPanel({
  state,
  messages,
  tab,
  setTab,
  body,
  setBody,
  task,
  error,
  notice,
  moreHistory,
  canRetry,
  send,
  upload,
  history,
  retry,
}: ConversationPanelProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const previous = useRef({ first: 0, last: 0, height: 0, tab });
  const [newMessages, setNewMessages] = useState(false);
  const first = messages[0]?.sequence ?? 0;
  const last = messages.at(-1)?.sequence ?? 0;
  useLayoutEffect(() => {
    const node = scroller.current;
    if (!node || tab !== "chat") return;
    if (previous.current.first > first && previous.current.last === last)
      node.scrollTop += node.scrollHeight - previous.current.height;
    else if (nearBottom.current || previous.current.tab !== tab) {
      node.scrollTop = node.scrollHeight;
      setNewMessages(false);
    } else if (last > previous.current.last) setNewMessages(true);
    previous.current = { first, last, height: node.scrollHeight, tab };
  }, [first, last, tab]);
  const files = state.files ?? [];
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as "chat" | "files")}
      className="flex h-full min-h-0 min-w-0 flex-col gap-0 overflow-hidden bg-card"
      aria-label="Appointment conversation"
      aria-busy={!!task}
    >
      <header className="border-b border-border px-4 pt-4">
        <h2 className="pr-11 text-base font-semibold">Conversation</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Messages and files for this appointment
        </p>
        <TabsList className="mt-3 mb-3 h-10 w-full" aria-label="Conversation panel">
          <TabsTrigger value="chat">
            <MessageSquare aria-hidden className="size-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="files">
            <Paperclip aria-hidden className="size-4" />
            Files{" "}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
              {files.length}
            </span>
          </TabsTrigger>
        </TabsList>
      </header>
      <TabsContent value={tab} className="flex min-h-0 flex-1 flex-col">
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={scroller}
            onScroll={(event) => {
              const node = event.currentTarget;
              nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 64;
              if (nearBottom.current) setNewMessages(false);
            }}
            className="min-h-0 flex-1 overflow-y-auto p-4"
            aria-label={tab === "chat" ? "Appointment messages" : "Shared files"}
            tabIndex={0}
          >
            {tab === "chat" ? (
              <>
                {state.history_limited && moreHistory && (
                  <Button
                    className="mb-4 w-full"
                    variant="ghost"
                    disabled={!!task}
                    onClick={history}
                  >
                    {task === "history" ? "Loading earlier messages…" : "Load earlier messages"}
                  </Button>
                )}
                {!messages.length && (
                  <div className="grid justify-items-center gap-3 py-10 text-center">
                    <span className="grid size-12 place-items-center rounded-full bg-teal-50 text-teal-ink">
                      <MessageSquare aria-hidden className="size-5" />
                    </span>
                    <h3 className="text-sm font-semibold">Start the conversation</h3>
                    <p className="max-w-xs text-xs leading-5 text-muted-foreground">
                      Send a message while you wait or share a document your doctor needs to see.
                    </p>
                  </div>
                )}
                {messages.map((message, index) => {
                  const day = messageDay(message.sent_at, state.timezone);
                  const mine = message.role === state.role;
                  return (
                    <div key={message.id} className="mb-4">
                      {(!index ||
                        day !== messageDay(messages[index - 1].sent_at, state.timezone)) && (
                        <p className="my-4 text-center text-[11px] text-muted-foreground">{day}</p>
                      )}
                      <article
                        className={cn(
                          "max-w-[92%] rounded-xl p-3 text-sm",
                          mine ? "ml-auto bg-teal-50 text-teal-950" : "bg-muted text-foreground",
                        )}
                      >
                        <p className="mb-1 text-xs font-semibold">
                          {mine
                            ? "You"
                            : message.role === "doctor"
                              ? (state.doctor ?? "Doctor")
                              : (state.patient ?? "Patient")}
                        </p>
                        <p className="wrap-anywhere whitespace-pre-wrap">{message.body}</p>
                        <time
                          className="mt-2 block text-[11px] opacity-80"
                          dateTime={message.sent_at}
                          title={day}
                        >
                          {callTime(message.sent_at, state.timezone)}
                        </time>
                      </article>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="grid gap-4">
                <p className="text-xs leading-5 text-muted-foreground">
                  PDF, JPEG, PNG or WebP · up to 20 MB. Only files that pass the security scan can
                  be downloaded.
                </p>
                {!files.length && (
                  <div className="grid justify-items-center gap-3 py-10 text-center">
                    <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                      <FileUp aria-hidden className="size-5" />
                    </span>
                    <h3 className="text-sm font-semibold">No shared files yet</h3>
                    <p className="max-w-xs text-xs leading-5 text-muted-foreground">
                      Add a relevant document or image. Room files are separate from the patient’s
                      clinical documents.
                    </p>
                  </div>
                )}
                {files.map((file) => {
                  const clean = file.state === "clean";
                  const scanning = file.state === "pending";
                  const label = clean
                    ? "Ready to download"
                    : scanning
                      ? "Security scan pending"
                      : file.state === "rejected"
                        ? "Blocked by security scan"
                        : file.state === "unavailable"
                          ? "Scan temporarily unavailable"
                          : "File unavailable";
                  return (
                    <article
                      key={file.id}
                      className="flex min-w-0 items-start gap-3 border-b border-border pb-4"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-teal-ink">
                        <FileText aria-hidden className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium wrap-anywhere">{file.filename}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {fileSize(file.size)} ·{" "}
                          {file.role === state.role
                            ? "Shared by you"
                            : file.role === "doctor"
                              ? "Shared by doctor"
                              : "Shared by patient"}
                        </p>
                        <p
                          className={cn(
                            "mt-2 flex items-center gap-1.5 text-[11px]",
                            clean
                              ? "text-teal-ink"
                              : scanning
                                ? "text-muted-foreground"
                                : "text-amber-900 dark:text-amber-200",
                          )}
                        >
                          {clean ? (
                            <ShieldCheck aria-hidden className="size-3.5" />
                          ) : scanning ? (
                            <LoaderCircle
                              aria-hidden
                              className="size-3.5 animate-spin motion-reduce:animate-none"
                            />
                          ) : (
                            <TriangleAlert aria-hidden className="size-3.5" />
                          )}
                          {label}
                        </p>
                      </div>
                      {clean && (
                        <a
                          href={`/api/backend/calls/files/${file.id}`}
                          className="grid size-11 shrink-0 place-items-center rounded-lg border border-border hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                          aria-label={`Download ${file.filename}`}
                        >
                          <Download aria-hidden className="size-4" />
                        </a>
                      )}
                    </article>
                  );
                })}
                {canRetry && !task && (
                  <Button variant="outline" onClick={retry}>
                    Retry file upload
                  </Button>
                )}
              </div>
            )}
          </div>
          {tab === "chat" && newMessages && (
            <Button
              className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-md"
              onClick={() => {
                scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
                nearBottom.current = true;
                setNewMessages(false);
              }}
            >
              <ArrowDown aria-hidden className="size-4" />
              New messages
            </Button>
          )}
        </div>
        <div className="grid shrink-0 gap-3 border-t border-border p-4">
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/5 p-3 text-xs leading-5 text-destructive"
            >
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-xs leading-5 text-teal-ink">
              {notice}
            </p>
          )}
          {task === "upload" && (
            <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
              <LoaderCircle
                aria-hidden
                className="size-4 animate-spin motion-reduce:animate-none"
              />
              Uploading file. Security scan follows…
            </p>
          )}
          <form
            noValidate
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            {tab === "chat" && (
              <>
                <label className="sr-only" htmlFor="call-message">
                  Message to the other participant
                </label>
                <Textarea
                  id="call-message"
                  className="max-h-24 min-h-16 resize-none"
                  value={body}
                  disabled={!!task}
                  maxLength={2000}
                  rows={2}
                  placeholder="Write a message…"
                  aria-describedby="call-message-hint"
                  onChange={(event) => setBody(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      send();
                    }
                  }}
                />
                <p
                  id="call-message-hint"
                  className="flex flex-wrap justify-between gap-1 text-[10px] text-muted-foreground"
                >
                  <span>Enter to send · Shift + Enter for a new line</span>
                  <span className="tabular-nums">{body.length}/2,000</span>
                </p>
              </>
            )}
            <div className="flex items-center justify-between gap-3">
              <label
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm focus-within:outline-2 focus-within:outline-primary hover:bg-muted",
                  !!task && "pointer-events-none opacity-50",
                )}
              >
                <Paperclip aria-hidden className="size-4" />
                Add file
                <input
                  className="sr-only"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  disabled={!!task}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) upload(file);
                  }}
                />
              </label>
              {tab === "chat" && (
                <Button type="submit" disabled={!!task || !body.trim()}>
                  {task === "send" ? (
                    <LoaderCircle
                      aria-hidden
                      className="size-4 animate-spin motion-reduce:animate-none"
                    />
                  ) : (
                    <Send aria-hidden className="size-4" />
                  )}
                  Send
                </Button>
              )}
            </div>
          </form>
          <p className="text-[10px] leading-4 text-muted-foreground">
            Times shown in {state.timezone ?? "Asia/Manila"}. Room access closes at the appointment
            end.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
