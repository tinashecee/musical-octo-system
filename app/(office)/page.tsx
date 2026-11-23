import Link from "next/link";
import { documentBalance, documentTotal } from "@/lib/calc";
import { formatDate, formatMoney, statusLabel } from "@/lib/format";
import { getProfile, listDocuments } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const profile = getProfile();
  const documents = listDocuments();
  const quotations = documents.filter((document) => document.type === "quotation");
  const invoices = documents.filter((document) => document.type === "invoice");
  const openQuotes = quotations.filter((document) => document.status === "draft" || document.status === "sent");
  const unpaid = invoices.filter((document) => ["sent", "partially_supplied", "partially_paid"].includes(document.status));
  const drafts = invoices.filter((document) => document.status === "draft");
  const outstanding = new Map<string, number>();
  for (const invoice of unpaid) {
    outstanding.set(invoice.currency, (outstanding.get(invoice.currency) || 0) + documentBalance(invoice));
  }
  const recent = documents.slice(0, 8);
  const company = profile?.tradingName || profile?.legalName;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-serif text-4xl">{company || "Dashboard"}</h1>
      <p className="mt-2 max-w-2xl text-muted">
        {profile ? "Write a quotation, accept it when the work is agreed, then adjust the invoice if something was not supplied." : "Add your company once. After that, every quotation and invoice uses your logo, address, and bank details."}
      </p>

      {!profile ? (
        <section className="card mt-6 p-6">
          <h2 className="font-serif text-2xl">Start with the company profile</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
            <li>Add the legal name, logo, address, tax numbers, and bank account.</li>
            <li>Save the people you invoice.</li>
            <li>Create a quotation, or start an invoice directly.</li>
          </ol>
          <Link href="/profile" className="btn-primary mt-5 inline-flex">Set up profile</Link>
        </section>
      ) : (
        <>
          <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat href="/quotations?status=open" label="Open quotations" value={String(openQuotes.length)} hint="Drafts and sent" />
            <Stat href="/invoices?status=unpaid" label="Unpaid invoices" value={String(unpaid.length)} hint={outstanding.size ? [...outstanding.entries()].map(([currency, amount]) => formatMoney(amount, currency)).join(" · ") : "Nothing outstanding"} />
            <Stat href="/invoices?status=draft" label="Draft invoices" value={String(drafts.length)} hint="Including ones from accepted quotations" />
            <Stat href="/invoices" label="Invoices" value={String(invoices.length)} hint={`${quotations.length} quotations on record`} />
          </section>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/quotations/new" className="btn-primary">New quotation</Link>
            <Link href="/invoices/new" className="btn-secondary">New invoice</Link>
          </div>
        </>
      )}

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Recent documents</h2>
        <div className="card mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((document) => (
                <tr key={document.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-semibold">
                    <Link className="text-moss" href={`/${document.type === "quotation" ? "quotations" : "invoices"}/${document.id}`}>{document.number}</Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{document.type}</td>
                  <td className="px-4 py-3">{document.clientSnapshot.name}</td>
                  <td className="px-4 py-3">{formatDate(document.issueDate)}</td>
                  <td className="px-4 py-3">{formatMoney(documentTotal(document), document.currency)}</td>
                  <td className="px-4 py-3">{statusLabel(document.status)}</td>
                </tr>
              ))}
              {recent.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-muted">No documents yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ href, label, value, hint }: { href: string; label: string; value: string; hint: string }) {
  return (
    <Link href={href} className="card block p-4 hover:border-moss">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </Link>
  );
}
