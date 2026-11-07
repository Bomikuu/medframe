import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  Palette,
  Stethoscope,
  UserRound,
  UsersRound,
  CalendarCheck2,
  ContactRound,
  ShieldCheck,
  Clock3,
  Paintbrush,
  HeartPulse,
  FileCheck2,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import type { Step } from "./schema";

type Benefit = { icon: LucideIcon; title: string; description: string };
export const onboardingPresentation: Record<
  Step,
  {
    icon: LucideIcon;
    subtitle: string;
    why: string;
    benefits: Benefit[];
  }
> = {
  clinic: {
    icon: Building2,
    subtitle: "Basic details about your clinic",
    why: "A familiar clinic name and accurate contact details help your team recognize the organization they’re working in.",
    benefits: [
      {
        icon: UsersRound,
        title: "Recognizable records",
        description: "Your clinic name identifies your organization throughout the workspace.",
      },
      {
        icon: ContactRound,
        title: "Reliable contact details",
        description: "Keep a working email and phone number on your clinic’s profile.",
      },
      {
        icon: MapPin,
        title: "A clear location",
        description: "Add an address now, or complete these optional details later.",
      },
    ],
  },
  specialties: {
    icon: Stethoscope,
    subtitle: "Choose the care you provide",
    why: "Describe the care your clinic offers so its initial setup reflects your practice.",
    benefits: [
      {
        icon: HeartPulse,
        title: "Your areas of care",
        description: "Choose more than one specialty when your clinic provides several services.",
      },
      {
        icon: UsersRound,
        title: "Your clinical team",
        description: "Select the provider types and team size that describe your practice.",
      },
      {
        icon: ShieldCheck,
        title: "Permissions stay separate",
        description: "Staff access and clinical credentials are assigned after setup.",
      },
    ],
  },
  branding: {
    icon: Palette,
    subtitle: "Add your logo and preferences",
    why: "Give your team a recognizable workspace with your clinic’s own identity.",
    benefits: [
      {
        icon: Building2,
        title: "A familiar identity",
        description: "Use your clinic logo, or keep a simple initials mark.",
      },
      {
        icon: Paintbrush,
        title: "Preview your colors",
        description: "See your chosen colors in the workspace preview before continuing.",
      },
      {
        icon: ShieldCheck,
        title: "Checked uploads",
        description: "Your logo must finish its security scan before clinic creation.",
      },
    ],
  },
  practice: {
    icon: CalendarDays,
    subtitle: "Set your schedule and preferences",
    why: "Set a starting schedule that reflects when your clinic is open and how it welcomes patients.",
    benefits: [
      {
        icon: CalendarCheck2,
        title: "A week that fits",
        description: "Choose separate opening and closing times for every operating day.",
      },
      {
        icon: Clock3,
        title: "Consistent clinic time",
        description: "Your timezone keeps the clinic’s dates and times consistent.",
      },
      {
        icon: UsersRound,
        title: "Room to configure later",
        description: "Individual provider schedules can be set up in your workspace.",
      },
    ],
  },
  account: {
    icon: UserRound,
    subtitle: "Create your administrator profile",
    why: "A verified administrator account gives your clinic a named person responsible for managing its workspace.",
    benefits: [
      {
        icon: ContactRound,
        title: "Your invited email",
        description: "Use the email on this invitation to register or sign in.",
      },
      {
        icon: ShieldCheck,
        title: "Protected access",
        description: "Complete account verification and keep your recovery codes safe.",
      },
      {
        icon: UsersRound,
        title: "Invite your team later",
        description: "Administrator access does not automatically grant clinical permissions.",
      },
    ],
  },
  review: {
    icon: ClipboardCheck,
    subtitle: "Check your details before finishing",
    why: "One final review helps you start with accurate clinic details and the workspace you intended.",
    benefits: [
      {
        icon: FileCheck2,
        title: "Review what’s saved",
        description: "Use Edit beside a section to correct its details.",
      },
      {
        icon: ShieldCheck,
        title: "Finish verification",
        description: "Account verification and any logo scan must be complete.",
      },
      {
        icon: HeartPulse,
        title: "Start with patient care",
        description: "Open your new workspace to register a patient or invite your team.",
      },
    ],
  },
};
