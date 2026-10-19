import { stationRequest } from "../client";

export type Task = "booking" | "check_in" | "walk_in" | "payments";
export type Department = {
  id: string;
  name: string;
  kind: string;
  prefix: string;
  duration: number;
  active: boolean;
  early_minutes: number;
  late_minutes: number;
  version: number;
};
export type Provider = { id: string; name: string };
export type Setup = {
  clinic: string;
  branch: string;
  timezone: string;
  functions: string[];
  departments: Department[];
  providers: Provider[];
  idle_seconds: number;
  generation: number;
  strict_verification: boolean;
};
export type PatientSession = { patient_name: string; expires_at: string; idle_expires_at: string };
export type Appointment = {
  id: string;
  start: string;
  end: string;
  provider: string;
  provider_id: string;
  status: string;
  version: number;
};
export type Ticket = {
  id: string;
  visit_id: string;
  department_id: string;
  department: string;
  label: string;
  status: string;
  version: number;
  priority: boolean;
  issued_at: string;
  next_step: string;
  provider: string | null;
  queue_number: number | null;
};
export type Snapshot = PatientSession & { appointments: Appointment[]; tickets: Ticket[] };
export type Slot = { start: string; end: string; local: string; timezone: string };
export type Invoice = {
  number: string;
  currency: string;
  total: string;
  outstanding: string;
  paid: string;
  status: string;
  lines: { description: string; quantity: number; amount: string }[];
};
export type Balances = {
  invoices: Invoice[];
  digital_available: boolean;
  cash_hardware_available: boolean;
  instruction: string;
};
export type Result = {
  kind: "ticket" | "appointment" | "intake";
  message: string;
  ticket?: Ticket;
  appointment?: Appointment;
  reference?: string;
};
export type Selection = {
  department_id: string;
  provider_id: string;
  date: string;
  start: string;
  appointment_id: string;
};
export const kioskRequest = <T>(body: unknown) => stationRequest<T>("kiosk", body);
export const taskNames: Record<Task, string> = {
  booking: "Book an appointment",
  check_in: "Check in",
  walk_in: "Join the walk-in queue",
  payments: "Pay for clinic services",
};
export function clinicTime(value: string, timezone: string, date = false) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    ...(date
      ? { dateStyle: "medium" as const, timeStyle: "short" as const }
      : { hour: "numeric" as const, minute: "2-digit" as const }),
  }).format(new Date(value));
}
