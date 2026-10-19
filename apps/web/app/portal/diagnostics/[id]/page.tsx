import { PatientDiagnostics } from "@/features/diagnostics/patient-diagnostics";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientDiagnostics id={id} />;
}
