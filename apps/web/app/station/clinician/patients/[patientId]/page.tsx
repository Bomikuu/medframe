import { StationPatient } from "@/features/stations/station-patient";
export default async function Page({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  return <StationPatient patientId={patientId} />;
}
