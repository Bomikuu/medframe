"use client";

import { useEffect, useRef, useState } from "react";
import { errorMessage, getCsrfToken, requestWithCsrf } from "@/lib/auth/client";
import type { CallState, CallMessage } from "./client";
import { ConversationPanel } from "./conversation-panel";

export function CallConversation({
  state,
  refresh,
}: {
  state: CallState;
  refresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"chat" | "files">("chat");
  const [body, setBody] = useState("");
  const [task, setTask] = useState<"send" | "upload" | "history" | null>(null);
  const pending = useRef(false);
  const alive = useRef(true);
  const uploadController = useRef<AbortController | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [older, setOlder] = useState<CallMessage[]>([]);
  const [moreHistory, setMoreHistory] = useState(true);
  const retry = useRef({ body: "", id: "" });
  const fileRetry = useRef<{ file: File; id: string } | null>(null);
  const messages = [
    ...new Map(
      [...older, ...(state.messages ?? [])].map((message) => [message.id, message]),
    ).values(),
  ].sort((a, b) => a.sequence - b.sequence);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      uploadController.current?.abort();
    };
  }, []);
  function begin(next: Exclude<typeof task, null>) {
    if (pending.current) return false;
    pending.current = true;
    setTask(next);
    setError("");
    setNotice("");
    return true;
  }
  function finish() {
    pending.current = false;
    if (alive.current) setTask(null);
  }
  async function loadEarlier() {
    if (!messages.length || !begin("history")) return;
    try {
      const page = await requestWithCsrf<{ messages: CallMessage[]; has_more: boolean }>(
        "calls/rooms",
        { action: "history", room_id: state.id, before: messages[0].sequence },
      );
      if (alive.current) {
        setOlder((previous) => [...page.messages, ...previous]);
        setMoreHistory(page.has_more);
      }
    } catch (failure) {
      if (alive.current) setError(errorMessage(failure));
    } finally {
      finish();
    }
  }
  async function send() {
    if (!body.trim() || !begin("send")) return;
    const sent = body;
    if (retry.current.body !== sent) retry.current = { body: sent, id: crypto.randomUUID() };
    try {
      await requestWithCsrf("calls/rooms", {
        action: "message",
        room_id: state.id,
        body: sent,
        request_id: retry.current.id,
      });
      if (!alive.current) return;
      setBody("");
      retry.current = { body: "", id: "" };
      await refresh();
    } catch (failure) {
      if (alive.current) setError(errorMessage(failure));
    } finally {
      finish();
    }
  }
  async function upload(file: File) {
    if (!begin("upload")) return;
    setTab("files");
    if (fileRetry.current?.file !== file) fileRetry.current = { file, id: crypto.randomUUID() };
    const controller = new AbortController();
    uploadController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 90000);
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("Choose a file of 20 MB or less.");
      if (!/\.(pdf|jpe?g|png|webp)$/i.test(file.name))
        throw new Error("Choose a PDF, JPEG, PNG or WebP file.");
      const data = new FormData();
      data.append("file", file);
      data.append("request_id", fileRetry.current.id);
      const response = await fetch(`/api/backend/calls/upload/${state.id}`, {
        method: "POST",
        headers: { "X-CSRF-Token": await getCsrfToken() },
        body: data,
        signal: controller.signal,
      });
      const value = await response.json();
      if (!response.ok)
        throw new Error(value.message ?? "Upload failed. Your file has not been confirmed.");
      if (!alive.current) return;
      fileRetry.current = null;
      setNotice("Upload received. The file can be downloaded after it passes the security scan.");
      await refresh();
    } catch (failure) {
      if (alive.current)
        setError(
          controller.signal.aborted
            ? "The upload timed out. Retry the same file to check or complete the upload without creating a duplicate."
            : errorMessage(failure),
        );
    } finally {
      window.clearTimeout(timeout);
      if (uploadController.current === controller) uploadController.current = null;
      finish();
    }
  }
  return (
    <ConversationPanel
      state={state}
      messages={messages}
      tab={tab}
      setTab={setTab}
      body={body}
      setBody={setBody}
      task={task}
      error={error}
      notice={notice}
      moreHistory={moreHistory}
      canRetry={!!fileRetry.current}
      send={() => void send()}
      upload={(file) => void upload(file)}
      history={() => void loadEarlier()}
      retry={() => {
        if (fileRetry.current) void upload(fileRetry.current.file);
      }}
    />
  );
}
