import { requestWithCsrf } from "@/lib/auth/client";

export type Mode = "clinician" | "kiosk" | "display";
export type Device = {
  id: string;
  name: string;
  mode: Mode;
  branch_id: string;
  branch: string;
  functions: string[];
  state: "setup" | "pending" | "active" | "revoked";
  version: number;
  last_seen_at: string | null;
  verification_phrase: string | null;
};
export type StationContext = {
  access?: AccessSession;
  paired: boolean;
  error: string | null;
  device: {
    name: string;
    mode: Mode;
    state: string;
    functions: string[];
    verification_phrase: string;
    organization_id: string;
    branch: string;
  } | null;
};
export type AccessSession = {
  clinician: string;
  expires_at: string;
  encounter_id: string;
  organization_id: string;
};
export type Selection = {
  tab?: string;
  tooth?: string;
  surface?: string | null;
  structure?: string;
  layer?: "body" | "skeleton";
};
export type Lease = {
  mine: boolean;
  live: boolean;
  locked: boolean;
  can_edit: boolean;
  owner: string | null;
  device: string;
  expires_at: string | null;
  generation: number;
  version: number;
  selection: Selection;
};
export type Transfer = { id: string; code: string; expires_at: string };
export type HandoffPreview = {
  kind: string;
  sender: string;
  recipient: string;
  patient: string;
  reason: string;
  summary: string;
  tasks: string;
  version: number;
  expires_at: string;
};
export const stationRequest = <T>(path: string, body: unknown = {}) =>
  requestWithCsrf<T>(`stations/${path}`, body);

export const modeLabels: Record<Mode, string> = {
  clinician: "Clinician tablet",
  kiosk: "Patient kiosk",
  display: "Queue display",
};
export const functionLabels: Record<string, string> = {
  "clinical.read": "View permitted clinical records",
  "clinical.write": "Edit permitted consultations",
  "billing.read": "View permitted bills",
  "payments.record": "Record payments with billing permission",
  booking: "Appointment booking",
  check_in: "Appointment check-in",
  walk_in: "Walk-in admission",
  payments: "Patient payments",
  "queue.display": "Read-only queue numbers",
};
export const modeFunctions: Record<Mode, string[]> = {
  clinician: ["clinical.read", "clinical.write", "billing.read", "payments.record"],
  kiosk: ["booking", "check_in", "walk_in", "payments"],
  display: ["queue.display"],
};
