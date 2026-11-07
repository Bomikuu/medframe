import type { Metadata } from "next";
import { AccountSettingsPage } from "@/features/settings/account-settings-page";

export const metadata: Metadata = { title: "Account & security · Medframe" };
export default function Page() {
  return <AccountSettingsPage />;
}
