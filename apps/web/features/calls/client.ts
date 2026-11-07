"use client";

import { requestWithCsrf } from "@/lib/auth/client";

export type CallMessage = {
  id: string;
  sequence: number;
  role: "doctor" | "patient";
  body: string;
  sent_at: string;
  request_id: string;
};
export type CallFile = { id: string; filename: string; size: number; state: string; role: string };
export type Aftercare = {
  id: string;
  next_steps: string;
  follow_up: string;
  reviewed_at: string;
  author: string;
};
export type ClinicalContext = {
  encounter_id: string | null;
  recent: {
    id: string;
    reason: string;
    status: string;
    provider_name: string;
    created_at: string;
  }[];
};
export type CallState = {
  id: string;
  version: number;
  generation: number;
  doctor_mode: "assigned" | "eligible";
  timing_mode?: "scheduled" | "instant";
  start: string;
  end: string;
  server_now: string;
  started: boolean;
  media_ready: boolean;
  connection?: { profile: "loopback" | "internet"; secure_origin: boolean };
  needs_reset?: boolean;
  encounter_id?: string | null;
  aftercare?: Aftercare | null;
  pin?: string;
  can_join_doctor?: boolean;
  staff_signed_in?: boolean;
  has_access?: boolean;
  role?: "doctor" | "patient";
  participant_id?: string;
  patient?: string;
  doctor?: string;
  patient_id?: string;
  organization_id?: string;
  timezone?: string;
  messages?: CallMessage[];
  files?: CallFile[];
  history_limited?: boolean;
  patient_waiting?: boolean;
  admitted?: boolean;
  device_checks?: { camera?: boolean; microphone?: boolean; speaker?: boolean };
  patient_lobby?: {
    id: string;
    arrived_at: string;
    last_seen_at: string | null;
    admitted: boolean;
    device_checks: { camera?: boolean; microphone?: boolean; speaker?: boolean };
  } | null;
};

export function callRequest<T = CallState>(
  action: string,
  roomId: string,
  values: Record<string, unknown> = {},
  signal?: AbortSignal,
) {
  return requestWithCsrf<T>("calls/rooms", { action, room_id: roomId, ...values }, { signal });
}

export function callSocket(roomId: string, tail = "updates") {
  const base =
    process.env.NEXT_PUBLIC_CALL_WS_ORIGIN ||
    (location.protocol === "https:" ? `wss://${location.host}` : `ws://${location.hostname}:8000`);
  return `${base}/ws/calls/${roomId}/${tail}`;
}
