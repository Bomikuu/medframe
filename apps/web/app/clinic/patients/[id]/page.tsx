import { PatientOverview } from "@/features/patients/patient-overview";

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientOverview key={id} patientId={id} />;
}
