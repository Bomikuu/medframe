import { redirect } from "next/navigation";
import { readBrowserSession } from "@/lib/server/session-route";
import { SessionUnavailable } from "@/features/auth/session-recovery";

export default async function ContinueSessionPage() {
  const session = await readBrowserSession();
  if (!session) return <SessionUnavailable />;
  redirect(session.destination);
}
