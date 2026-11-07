import {
  CalendarDays,
  FileText,
  Globe,
  Microscope,
  MonitorSmartphone,
  Palette,
  ShieldCheck,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";

type SettingsTab = {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
  permission?: string;
};
type SettingsGroup = { id: string; label: string; description: string; tabs: SettingsTab[] };

export const settingsGroups: SettingsGroup[] = [
  {
    id: "workspace",
    label: "Account & workspace",
    description: "Your identity, workspace preferences and clinic’s online presence.",
    tabs: [
      {
        id: "account",
        label: "Account & security",
        description: "Edit your name and photo, review browser security and clinic sign-in rules",
        path: "/clinic/settings/security",
        icon: ShieldCheck,
      },
      {
        id: "appearance",
        label: "Appearance",
        description: "Display preferences, dashboard layout and clinic branding",
        path: "/clinic/settings/appearance",
        icon: Palette,
      },
      {
        id: "website",
        label: "Clinic website",
        description: "Clinic website content, settings and publication",
        path: "/clinic/settings/website",
        icon: Globe,
        permission: "organization.manage",
      },
    ],
  },
  {
    id: "clinical",
    label: "Clinic setup",
    description: "The people, specialties and documentation behind patient care.",
    tabs: [
      {
        id: "staff",
        label: "Staff & access",
        description: "Team profiles, doctor assignments and access levels",
        path: "/clinic/settings/staff",
        icon: Users,
        permission: "organization.manage",
      },
      {
        id: "specialties",
        label: "Specialties",
        description: "Clinic capabilities and specialty documentation starters",
        path: "/clinic/settings/specialties",
        icon: Stethoscope,
        permission: "organization.manage",
      },
      {
        id: "templates",
        label: "Templates",
        description: "Reusable consultation notes and documentation",
        path: "/clinic/settings/templates",
        icon: FileText,
        permission: "encounters.write",
      },
    ],
  },
  {
    id: "operations",
    label: "Clinic operations",
    description: "Availability, connected devices and diagnostic partners.",
    tabs: [
      {
        id: "schedules",
        label: "Schedules",
        description: "Provider hours, rooms and date overrides",
        path: "/clinic/settings/schedules",
        icon: CalendarDays,
        permission: "operations.read",
      },
      {
        id: "devices",
        label: "Devices & Stations",
        description: "Approved devices, pairing codes and station access",
        path: "/clinic/settings/stations",
        icon: MonitorSmartphone,
        permission: "organization.manage",
      },
      {
        id: "diagnostic-centers",
        label: "Diagnostic centers",
        description: "Diagnostic partners and referral destinations",
        path: "/clinic/settings/diagnostic-centers",
        icon: Microscope,
        permission: "diagnostics.partners.manage",
      },
    ],
  },
];
