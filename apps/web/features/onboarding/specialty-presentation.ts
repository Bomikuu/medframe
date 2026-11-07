import {
  Activity,
  Baby,
  Bone,
  HeartPulse,
  ScanFace,
  Smile,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

type SpecialtyPresentation = { description: string; icon: LucideIcon };
const specialtyDescriptions: Record<string, SpecialtyPresentation> = {
  "General Dentistry": {
    icon: Smile,
    description: "Routine dental examinations, preventive care and restorative treatments.",
  },
  Orthodontics: {
    icon: Smile,
    description: "Tooth alignment, bite assessment, braces and clear aligners.",
  },
  "Oral Surgery": {
    icon: Smile,
    description: "Surgical care of the mouth and jaws, including tooth extractions.",
  },
  Endodontics: {
    icon: Smile,
    description: "Root canal treatment and care of the tissues inside the tooth.",
  },
  Periodontics: {
    icon: Smile,
    description: "Care of the gums and the structures that support the teeth.",
  },
  "Pediatric Dentistry": {
    icon: Baby,
    description: "Dental care for children, from early checkups to developing teeth.",
  },
  Prosthodontics: {
    icon: Smile,
    description: "Restoring and replacing teeth with crowns, bridges and dentures.",
  },
  "General Practice": {
    icon: Stethoscope,
    description: "Everyday health concerns, routine checkups and preventive care.",
  },
  "Family Medicine": {
    icon: Stethoscope,
    description: "Ongoing primary care for people across different stages of life.",
  },
  "Internal Medicine": {
    icon: Activity,
    description: "Adult health, medical assessment and management of chronic conditions.",
  },
  Pediatrics: {
    icon: Baby,
    description: "Health, growth and development care for infants, children and adolescents.",
  },
  Dermatology: {
    icon: ScanFace,
    description: "Assessment and care of conditions affecting the skin, hair and nails.",
  },
  Cardiology: {
    icon: HeartPulse,
    description: "Assessment and management of heart and cardiovascular conditions.",
  },
  Orthopedics: {
    icon: Bone,
    description: "Care of bones, joints, muscles and related movement conditions.",
  },
};

export function specialtyPresentation(name: string, category: string): SpecialtyPresentation {
  return (
    specialtyDescriptions[name] ?? {
      icon: category === "dental" ? Smile : Stethoscope,
      description:
        category === "dental"
          ? "Specialist dental care offered by your clinic."
          : "Specialist medical care offered by your clinic.",
    }
  );
}
