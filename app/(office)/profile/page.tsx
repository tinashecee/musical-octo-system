import { ProfileForm } from "@/components/ProfileForm";
import { getProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return <ProfileForm initial={getProfile()} />;
}
