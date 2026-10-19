import type { ReactNode } from "react";
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-white text-foreground">{children}</div>;
}
