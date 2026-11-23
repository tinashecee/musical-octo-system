import { AppShell } from "@/components/AppShell";
import { getProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  const profile = getProfile();
  const companyName = profile?.tradingName || profile?.legalName || "";
  return <AppShell companyName={companyName}>{children}</AppShell>;
}
