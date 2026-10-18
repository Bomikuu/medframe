import { ConsultationPage } from "@/features/consultations/consultation-pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ConsultationPage encounterId={id} />;
}
