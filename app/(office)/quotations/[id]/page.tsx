import { notFound, redirect } from "next/navigation";
import { DocumentEditor } from "@/components/DocumentEditor";
import { getDocument, getProfile, listClients } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function QuotationEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = getProfile();
  const clients = listClients();
  if (id === "new") {
    return <DocumentEditor type="quotation" initial={null} profile={profile} clients={clients} linked={null} source={null} />;
  }
  const document = getDocument(id);
  if (!document) notFound();
  if (document.type !== "quotation") redirect(`/invoices/${document.id}`);
  const linkedDocument = document.invoiceId ? getDocument(document.invoiceId) : null;
  return (
    <DocumentEditor
      type="quotation"
      initial={document}
      profile={profile}
      clients={clients}
      linked={linkedDocument ? { id: linkedDocument.id, number: linkedDocument.number } : null}
      source={null}
    />
  );
}
