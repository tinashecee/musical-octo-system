import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentPaper } from "@/components/DocumentPaper";
import { PrintButton } from "@/components/PrintButton";
import { present } from "@/lib/present";
import { getDocument, getProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = getDocument(id);
  if (!document) notFound();
  const profile = getProfile();
  const company = document.companySnapshot?.legalName || document.companySnapshot?.tradingName ? document.companySnapshot : profile;
  if (!company) notFound();
  const view = present(document, company);
  const back = document.type === "quotation" ? `/quotations/${document.id}` : `/invoices/${document.id}`;

  return (
    <div className="min-h-screen bg-paper px-4 py-6">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap gap-2">
        <Link href={back} className="btn-secondary">Back to editor</Link>
        <a className="btn-secondary" href={`/api/documents/${document.id}/pdf`}>Download PDF</a>
        <PrintButton />
      </div>
      <div className="mx-auto max-w-[210mm]">
        <DocumentPaper view={view} />
      </div>
    </div>
  );
}
