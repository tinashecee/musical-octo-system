import { SettingsForm } from "@/components/SettingsForm";
import { getSettings, publicSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <SettingsForm initial={publicSettings(getSettings())} />;
}
