"use client";

import { useState } from "react";
import { ArrowUpRight, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import type { CallState } from "./client";

export function InstantRoomReady({ room }: { room: CallState }) {
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const path = `/appointments/room/${room.id}`;
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;
  async function copy(value: string) {
    setNotice("");
    setError("");
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copied to clipboard.");
    } catch {
      setError("Clipboard unavailable. Select and copy the displayed text.");
    }
  }
  return (
    <section className="grid gap-5" aria-label="Instant room ready">
      <div className="flex items-start gap-3">
        <CheckCircle2 aria-hidden className="mt-1 size-6 shrink-0 text-teal-ink" />
        <div>
          <h2 className="text-lg font-semibold">Your instant room is ready</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Share this link and PIN with the patient, then open the room with your doctor account.
            You decide when to end it.
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        <label htmlFor="instant-room-link" className="text-sm font-medium">
          Patient room link
        </label>
        <div className="flex gap-2">
          <input
            id="instant-room-link"
            readOnly
            value={url}
            className="min-w-0 flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Copy patient room link"
            onClick={() => void copy(url)}
          >
            <Copy aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5" aria-label={`Patient PIN ${room.pin ?? ""}`}>
          {room.pin?.split("").map((digit, index) => (
            <span
              key={index}
              className="grid size-10 place-items-center rounded-md border border-input text-lg font-semibold tabular-nums"
            >
              {digit}
            </span>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void copy(room.pin ?? "")}
          disabled={!room.pin}
        >
          <Copy aria-hidden className="size-4" />
          Copy PIN
        </Button>
      </div>
      {notice && (
        <p role="status" className="text-sm text-teal-ink">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ButtonLink href={path}>
        <ArrowUpRight aria-hidden className="size-4" />
        Open instant room
      </ButtonLink>
      <p className="text-xs leading-5 text-muted-foreground">
        The patient waits for your admission. Closing this panel or leaving the room does not end
        access; choose End room when finished.
      </p>
    </section>
  );
}
