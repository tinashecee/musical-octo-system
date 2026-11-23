import { notFound, redirect } from "next/navigation";
import { DocumentEditor } from "@/components/DocumentEditor";
import { getDocument, getProfile, listClients } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function InvoiceEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = getProfile();
  const clients = listClients();
  if (id === "new") {
    return <DocumentEditor type="invoice" initial={null} profile={profile} clients={clients} linked={null} source={null} />;
  }
  const document = getDocument(id);
  if (!document) notFound();
  if (document.type !== "invoice") redirect(`/quotations/${document.id}`);
  const sourceDocument = document.sourceQuotationId ? getDocument(document.sourceQuotationId) : null;
  return (
    <DocumentEditor
      type="invoice"
      initial={document}
      profile={profile}
      clients={clients}
      linked={null}
      source={sourceDocument ? { id: sourceDocument.id, number: sourceDocument.number } : null}
    />
  );
}
