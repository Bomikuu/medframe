"use client";

import { useState } from "react";
import { CalendarClock, Copy, RefreshCw, Video, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { FormSelect } from "@/features/patients/form-controls";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety } from "@/features/workspace/safety-provider";
import { errorMessage, requestWithCsrf } from "@/lib/auth/client";
import type { Appointment } from "@/features/operations/schema";
import { callRequest, type CallState } from "./client";

export function OnlineRoomManagement({
  appointment,
  reload,
}: {
  appointment: Appointment;
  reload: () => void;
}) {
  const { can } = useWorkspace();
  const { confirm } = useSafety();
  const [room, setRoom] = useState<CallState | null>(null);
  const [mode, setMode] = useState("assigned");
  const [timingMode, setTimingMode] = useState<"scheduled" | "instant">("scheduled");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const roomId = appointment.online_room_id ?? room?.id;
  async function manage(regenerate = false, nextTiming?: "scheduled" | "instant") {
    setBusy(true);
    setError("");
    try {
      let id = roomId;
      if (!id) {
        const created = await requestWithCsrf<CallState>("calls/rooms", {
          action: "create",
          appointment_id: appointment.id,
          doctor_mode: mode,
          timing_mode: timingMode,
        });
        id = created.id;
        reload();
      }
      setRoom(
        await callRequest(regenerate ? "regenerate" : "manage", id, {
          expected_version: room?.version,
          ...(nextTiming ? { timing_mode: nextTiming } : {}),
        }),
      );
      if (regenerate) {
        setNotice(
          nextTiming === "instant"
            ? "Instant room ready. Share the new PIN; previous access has been revoked."
            : "New access code created. Previous room access has been revoked.",
        );
        reload();
      }
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copied to clipboard.");
    } catch {
      setError("Clipboard unavailable. Select and copy the displayed text.");
    }
  }
  return (
    <section className="grid gap-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <Video aria-hidden className="size-4 text-teal-ink" />
          Online appointment
        </h3>
        {roomId && (
          <ButtonLink variant="outline" href={`/appointments/room/${roomId}`}>
            Open call room
          </ButtonLink>
        )}
      </div>
      {!roomId && can("appointments.manage") && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Room timing</legend>
          {(
            [
              {
                value: "scheduled",
                label: "Scheduled",
                description: "Opens ten minutes before the appointment and closes at its end.",
                icon: CalendarClock,
              },
              ...(can("encounters.write")
                ? [
                    {
                      value: "instant",
                      label: "Instant room",
                      description: "Patients can enter now. The doctor ends the room manually.",
                      icon: Zap,
                    },
                  ]
                : []),
            ] as const
          ).map(({ value, label, description, icon: Icon }) => (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${timingMode === value ? "border-teal-ink bg-teal-soft/40" : "border-border"}`}
            >
              <input
                type="radio"
                name={`room-timing-${appointment.id}`}
                value={value}
                checked={timingMode === value}
                onChange={() => setTimingMode(value as "scheduled" | "instant")}
                className="mt-1 accent-teal-700"
              />
              <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-ink" />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {!roomId && can("appointments.manage") && (
        <FormSelect
          id="call-doctor-mode"
          label="Doctor access"
          value={mode}
          onChange={setMode}
          options={[
            { value: "assigned", label: "Assigned doctor only" },
            { value: "eligible", label: "An eligible clinic doctor can claim" },
          ]}
        />
      )}
      {can("appointments.manage") && !room && (
        <Button variant="outline" disabled={busy} onClick={() => void manage()}>
          {busy
            ? "Opening…"
            : roomId
              ? "Show patient link & code"
              : timingMode === "instant"
                ? "Create instant room"
                : "Create online room"}
        </Button>
      )}
      {room && (
        <>
          <p className="flex items-center gap-2 text-sm font-medium text-teal-ink">
            {room.timing_mode === "instant" ? (
              <Zap aria-hidden className="size-4" />
            ) : (
              <CalendarClock aria-hidden className="size-4" />
            )}
            {room.timing_mode === "instant"
              ? "Instant room · doctor ends manually"
              : "Scheduled room · appointment time applies"}
          </p>
          {room.needs_reset && (
            <p role="status" className="text-sm text-muted-foreground">
              This room’s old access is closed. Regenerate access to reopen an active appointment’s
              room.
            </p>
          )}
          <label className="text-xs font-medium" htmlFor="call-share-link">
            Patient room link
          </label>
          <div className="flex min-w-0 items-center gap-2">
            <input
              id="call-share-link"
              readOnly
              value={`${location.origin}/appointments/room/${room.id}`}
              className="min-w-0 flex-1 rounded-md border border-input bg-muted p-2 text-xs"
            />
            <Button
              size="icon"
              variant="outline"
              aria-label="Copy room link"
              onClick={() => void copy(`${location.origin}/appointments/room/${room.id}`)}
            >
              <Copy aria-hidden className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1.5" aria-label={`Patient code ${room.pin ?? ""}`}>
              {room.pin?.split("").map((char, index) => (
                <span
                  key={index}
                  className="grid size-10 place-items-center rounded-md border border-input bg-card text-lg font-semibold tabular-nums"
                >
                  {char}
                </span>
              ))}
            </div>
            <Button
              variant="outline"
              disabled={!room.pin}
              onClick={() => void copy(room.pin ?? "")}
            >
              <Copy aria-hidden className="size-4" />
              Copy PIN
            </Button>
          </div>
          <Button variant="outline" disabled={busy} onClick={() => void manage()}>
            Refresh access details
          </Button>
          {room.timing_mode !== "instant" && can("encounters.write") && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                if (
                  await confirm({
                    title: "Open as an instant room?",
                    description:
                      "The new PIN will work immediately, without a scheduled entry window. Previous access will be revoked. End the room when you finish; the appointment booking stays unchanged.",
                    action: "Open instant room",
                  })
                )
                  await manage(true, "instant");
              }}
            >
              <Zap aria-hidden className="size-4" />
              Open as instant room
            </Button>
          )}
          <Button
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              if (
                await confirm({
                  title: "Reset room access?",
                  description:
                    "Both participants will disconnect. The previous PIN and room sessions will stop working.",
                  action: "Reset access",
                })
              )
                await manage(true);
            }}
          >
            <RefreshCw aria-hidden className="size-4" />
            Regenerate access
          </Button>
        </>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        {room?.timing_mode === "instant" || (!roomId && timingMode === "instant")
          ? "One doctor and one patient. PIN entry is available immediately; patient admission is still required. End the room when finished. Cancelling or completing the appointment also closes access."
          : "One doctor and one patient. The room closes at the appointment end unless the doctor explicitly extends it."}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-xs text-teal-ink">
          {notice}
        </p>
      )}
    </section>
  );
}
