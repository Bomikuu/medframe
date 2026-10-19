import { DiagnosticRequestDetail } from "@/features/diagnostics/request-detail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DiagnosticRequestDetail id={id} context="center" />;
}
