import { PatientTimeline } from "@/features/patients/patient-timeline";

export default async function PatientHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientTimeline key={id} patientId={id} />;
}
