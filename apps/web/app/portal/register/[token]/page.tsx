import { PatientRegistrationFlow } from "@/features/portal/registration/registration-flow";
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PatientRegistrationFlow token={token} />;
}
