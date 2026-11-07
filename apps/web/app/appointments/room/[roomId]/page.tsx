import { AppointmentCall } from "@/features/calls/appointment-call";

export default async function OnlineAppointmentPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <AppointmentCall key={roomId} roomId={roomId} />;
}
