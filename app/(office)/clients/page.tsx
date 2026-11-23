import { ClientsManager } from "@/components/ClientsManager";
import { listClients } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function ClientsPage() {
  return <ClientsManager initialClients={listClients()} />;
}
