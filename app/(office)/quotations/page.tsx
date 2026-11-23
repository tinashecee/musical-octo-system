import { DocumentList } from "@/components/DocumentList";
import { getProfile, listDocuments } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const documents = listDocuments("quotation");
  const invoices = listDocuments("invoice");
  const links: Record<string, { href: string; label: string }> = {};
  for (const quotation of documents) {
    if (!quotation.invoiceId) continue;
    const invoice = invoices.find((entry) => entry.id === quotation.invoiceId);
    if (invoice) links[quotation.id] = { href: `/invoices/${invoice.id}`, label: invoice.number };
  }
  return <DocumentList type="quotation" documents={documents} hasProfile={Boolean(getProfile())} links={links} initialFilter={status || "all"} />;
}
