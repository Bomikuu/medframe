import { PatientOverview } from "@/features/patients/patient-overview";

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientOverview patientId={id} edit />;
}
