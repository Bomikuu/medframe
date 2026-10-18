import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (!cookieStore.has("medframe_session")) redirect("/login");
  // Cookie presence only avoids a useless loading state. The API authorizes all data.
  return children;
}
