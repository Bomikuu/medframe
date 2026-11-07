import { StationEncounter } from "@/features/stations/station-encounter";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StationEncounter encounterId={id} />;
}
