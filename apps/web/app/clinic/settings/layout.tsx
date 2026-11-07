import type { ReactNode } from "react";
import { SettingsNavigation } from "@/features/settings/settings-navigation";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsNavigation>{children}</SettingsNavigation>;
}
