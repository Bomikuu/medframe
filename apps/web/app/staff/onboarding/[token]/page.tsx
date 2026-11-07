import { StaffOnboarding } from "@/features/staff/staff-onboarding";
import { localMailPreviewUrl } from "@/lib/server/local-mail-preview";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <StaffOnboarding token={token} mailPreview={localMailPreviewUrl()} />;
}
