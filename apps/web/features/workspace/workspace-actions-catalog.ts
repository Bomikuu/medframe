import { settingsGroups } from "@/features/settings/settings-catalog";
import {
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  ListOrdered,
  MonitorSmartphone,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";
import type { ActionChoice } from "@/features/patients/profile/patient-action-grid";
import type { ActionId } from "@/features/patients/profile/patient-actions-dialog";

export type WorkspaceAction = ActionChoice & { patientAction?: ActionId | null };
type Can = (permission: string) => boolean;

export function workspaceActions(can: Can, href: (path: string) => string): WorkspaceAction[] {
  const patients = can("patients.demographics.read");
  const definitions: (WorkspaceAction & { visible: boolean })[] = [
    {
      id: "patient-actions",
      label: "Patient actions",
      description: "Choose a patient to open all their available actions",
      group: "Patient care",
      icon: Users,
      tone: "care",
      patientAction: null,
      visible: patients,
    },
    {
      id: "consultation",
      label: "Start consultation",
      description: "Choose a patient and begin a new clinical visit",
      group: "Patient care",
      icon: Stethoscope,
      tone: "care",
      patientAction: "consultation",
      visible: patients && can("patients.clinical.read") && can("encounters.write"),
    },
    {
      id: "register",
      label: "Register patient",
      description: "Add a new patient to the current clinic",
      group: "Patient care",
      icon: UserPlus,
      tone: "care",
      href: href("/clinic/patients/new"),
      visible: can("patients.register"),
    },
    {
      id: "book",
      label: "Book appointment",
      description: "Choose a patient, provider and appointment time",
      group: "Visits & payments",
      icon: CalendarDays,
      patientAction: "book",
      visible: patients && can("operations.read") && can("appointments.manage"),
    },
    {
      id: "check-in",
      label: "Check in patient",
      description: "Confirm arrival for an existing appointment",
      group: "Visits & payments",
      icon: ClipboardCheck,
      patientAction: "check-in",
      visible: patients && can("operations.read") && can("queues.manage"),
    },
    {
      id: "walk-in",
      label: "Add walk-in",
      description: "Select a patient and admit them to the queue",
      group: "Visits & payments",
      icon: UserPlus,
      patientAction: "walk-in",
      visible: patients && can("operations.read") && can("queues.manage"),
    },
    {
      id: "payment",
      label: "Record payment",
      description: "Select a patient and an invoice for money already received",
      group: "Visits & payments",
      icon: CreditCard,
      tone: "finance",
      patientAction: "payment",
      visible: patients && can("billing.read") && can("payments.record"),
    },
    {
      id: "appointments",
      label: "Appointment calendar",
      description: "Review bookings and availability",
      group: "Workspace",
      icon: CalendarDays,
      href: href("/clinic/appointments"),
      visible: can("operations.read"),
    },
    {
      id: "queue",
      label: "Clinic queue",
      description: "Review arrivals and patients in consultation",
      group: "Workspace",
      icon: ListOrdered,
      href: href("/clinic/queue"),
      visible: can("operations.read"),
    },
    {
      id: "billing",
      label: "Billing",
      description: "Open invoices, balances and financial activity",
      group: "Workspace",
      icon: CreditCard,
      tone: "finance",
      href: href("/clinic/billing"),
      visible: can("billing.read"),
    },
    {
      id: "stations",
      label: "Patient Stations",
      description: "Manage patient terminal journeys and department queues",
      group: "Workspace",
      icon: MonitorSmartphone,
      href: href("/clinic/stations"),
      visible: can("operations.read"),
    },
  ];
  return definitions.filter((action) => action.visible);
}

export function workspaceSettings(can: Can, href: (path: string) => string): WorkspaceAction[] {
  return settingsGroups.flatMap((group) =>
    group.tabs
      .filter((tab) => !tab.permission || can(tab.permission))
      .map((tab) => ({
        id: tab.id,
        label: tab.label,
        description: tab.description,
        group: group.label,
        icon: tab.icon,
        href: href(tab.path),
      })),
  );
}
