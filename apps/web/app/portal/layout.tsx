import { SafetyProvider } from "@/features/workspace/safety-provider";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SafetyProvider>{children}</SafetyProvider>;
}
