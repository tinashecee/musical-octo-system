"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { documentTotal } from "@/lib/calc";
import { formatDate, formatMoney } from "@/lib/format";
import type { BusinessDocument, DocType } from "@/lib/types";

export function DocumentList({
  type,
  documents,
  hasProfile,
  links,
  initialFilter = "all",
}: {
  type: DocType;
  documents: BusinessDocument[];
  hasProfile: boolean;
  links: Record<string, { href: string; label: string }>;
  initialFilter?: string;
}) {
  const [filter, setFilter] = useState(initialFilter);
  const [query, setQuery] = useState("");
  const noun = type === "quotation" ? "quotation" : "invoice";
  const filters = type === "quotation"
    ? [["all", "All"], ["open", "Open"], ["draft", "Drafts"], ["sent", "Sent"], ["accepted", "Accepted"], ["declined", "Declined"]]
    : [["all", "All"], ["unpaid", "Unpaid"], ["draft", "Drafts"], ["sent", "Sent"], ["partially_supplied", "Part supplied"], ["paid", "Paid"], ["cancelled", "Cancelled"]];

  const visible = useMemo(() => {
    return documents.filter((document) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "open" && (document.status === "draft" || document.status === "sent")) ||
        (filter === "unpaid" && ["sent", "partially_supplied", "partially_paid"].includes(document.status)) ||
        document.status === filter;
      const haystack = `${document.number} ${document.clientSnapshot.name} ${document.customerReference}`.toLowerCase();
      return matchesFilter && haystack.includes(query.trim().toLowerCase());
    });
  }, [documents, filter, query]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl capitalize">{type === "quotation" ? "Quotations" : "Invoices"}</h1>
          <p className="mt-1 text-muted">{documents.length === 0 ? `No ${noun}s yet.` : `${documents.length} on record.`}</p>
        </div>
        {hasProfile ? <Link href={`/${type === "quotation" ? "quotations" : "invoices"}/new`} className="btn-primary">New {noun}</Link> : <Link href="/profile" className="btn-primary">Set up profile first</Link>}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {filters.map(([value, label]) => (
          <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-3 py-1 text-sm ${filter === value ? "bg-moss text-white" : "bg-white text-ink"}`}>{label}</button>
        ))}
        <input className="field ml-auto max-w-xs" placeholder="Search number or client" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Link</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((document) => (
              <tr key={document.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-semibold"><Link className="text-moss" href={`/${type === "quotation" ? "quotations" : "invoices"}/${document.id}`}>{document.number}</Link></td>
                <td className="px-4 py-3">{document.clientSnapshot.name}</td>
                <td className="px-4 py-3">{formatDate(document.issueDate)}</td>
                <td className="px-4 py-3">{formatMoney(documentTotal(document), document.currency)}</td>
                <td className="px-4 py-3"><StatusBadge status={document.status} /></td>
                <td className="px-4 py-3">{links[document.id] ? <Link className="text-moss" href={links[document.id].href}>{links[document.id].label}</Link> : "—"}</td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-muted">Nothing matches.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
