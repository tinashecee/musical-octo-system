import { DocumentList } from "@/components/DocumentList";
import { getProfile, listDocuments } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const documents = listDocuments("invoice");
  const quotations = listDocuments("quotation");
  const links: Record<string, { href: string; label: string }> = {};
  for (const invoice of documents) {
    if (!invoice.sourceQuotationId) continue;
    const quotation = quotations.find((entry) => entry.id === invoice.sourceQuotationId);
    if (quotation) links[invoice.id] = { href: `/quotations/${quotation.id}`, label: quotation.number };
  }
  return <DocumentList type="invoice" documents={documents} hasProfile={Boolean(getProfile())} links={links} initialFilter={status || "all"} />;
}
