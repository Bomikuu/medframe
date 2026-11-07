import type { Step } from "./schema";

export const stepDetails: Record<Step, { description: string; help: string[] }> = {
  clinic: {
    description: "Start with the details your patients and team will recognize.",
    help: [
      "Enter the clinic’s working name and a contact email you can access.",
      "The phone prefix defaults to +63 for the Philippines. Enter digits without the leading 0; spacing is added automatically.",
      "The address and description are optional. Continue saves this section before moving on.",
    ],
  },
  specialties: {
    description: "Choose the care you provide. You can select more than one specialty.",
    help: [
      "Select every specialty offered by your clinic; selected cards show a check.",
      "Choose a team size and at least one provider type.",
      "These choices describe your practice. Clinical credentials and staff permissions are assigned separately later.",
    ],
  },
  branding: {
    description: "Give your team a workspace that feels familiar.",
    help: [
      "Upload a PNG, JPEG or WebP logo up to 2 MiB, or keep your clinic initials.",
      "Choose a color preset or enter six-digit hex colors. Use a dark primary color for readable buttons.",
      "Wait for the logo’s security scan to finish before creating the clinic. Your preview stays private during setup.",
    ],
  },
  practice: {
    description: "Set your weekly rhythm, one day at a time.",
    help: [
      "Turn on each operating day and enter its opening and closing time.",
      "Closing must be later than opening on the same day. Turn off closed days.",
      "Choose the clinic’s timezone, appointment length and walk-in preference. Provider schedules are configured separately after setup.",
    ],
  },
  account: {
    description: "Set up the administrator who will manage this clinic.",
    help: [
      "Use the email this invitation was sent to. Existing users should choose Sign in.",
      "New passwords need 15–128 characters. The strength checklist offers suggestions; the server checks password acceptance.",
      "Read the development notices, then verify with your authenticator. Save recovery codes somewhere safe; passwords and MFA codes never enter the setup draft.",
    ],
  },
  review: {
    description: "Check the saved details before creating your clinical workspace.",
    help: [
      "Review each section and use Edit to correct details.",
      "Account verification and any logo scan must be complete before you can create the clinic.",
      "Creating the clinic grants administrator access. Register patients and assign clinical team access from the new workspace.",
    ],
  },
};
