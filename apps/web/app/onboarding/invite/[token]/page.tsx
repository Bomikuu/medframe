import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";
export const dynamic = "force-dynamic";
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OnboardingFlow token={token} />;
}
