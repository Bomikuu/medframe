import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";
import { localMailPreviewUrl } from "@/lib/server/local-mail-preview";
export default function SetupPage() {
  return <OnboardingFlow localInboxUrl={localMailPreviewUrl()} />;
}
