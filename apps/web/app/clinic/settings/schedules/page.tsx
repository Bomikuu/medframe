import type { Metadata } from "next";
import { SchedulesPage } from "@/features/operations/schedules";

export const metadata: Metadata = { title: "Provider schedules · Medframe" };
export default function Page() {
  return <SchedulesPage />;
}
