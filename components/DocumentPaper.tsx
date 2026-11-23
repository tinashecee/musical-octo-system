import { formatDate, formatMoney, formatQty } from "@/lib/format";
import type { Presentation } from "@/lib/present";

function Items({ view, headClass, zebra }: { view: Presentation; headClass: string; zebra?: boolean }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className={headClass}>
            <th className="px-2 py-2 font-semibold">Description</th>
            {view.showSupplied ? (
              <>
                <th className="px-2 py-2 text-right font-semibold">Ordered</th>
                <th className="px-2 py-2 text-right font-semibold">Supplied</th>
              </>
            ) : (
              <th className="px-2 py-2 text-right font-semibold">Qty</th>
            )}
            <th className="px-2 py-2 text-right font-semibold">Unit</th>
            <th className="px-2 py-2 text-right font-semibold">Price</th>
            {view.showDiscount ? <th className="px-2 py-2 text-right font-semibold">Disc</th> : null}
            {view.showTax ? <th className="px-2 py-2 text-right font-semibold">VAT</th> : null}
            <th className="px-2 py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {view.lines.map((line, index) => (
            <tr key={line.id} className={`border-b border-line align-top ${zebra && index % 2 === 1 ? "bg-stone-50" : ""}`}>
              <td className="px-2 py-2">{line.description || <span className="text-stone-400">Description</span>}</td>
              {view.showSupplied ? (
                <>
                  <td className="px-2 py-2 text-right">{formatQty(line.quantity)}</td>
                  <td className="px-2 py-2 text-right">{formatQty(line.supplied)}</td>
                </>
              ) : (
                <td className="px-2 py-2 text-right">{formatQty(line.supplied)}</td>
              )}
              <td className="px-2 py-2 text-right">{line.unit}</td>
              <td className="px-2 py-2 text-right">{formatMoney(line.unitPrice, view.currency)}</td>
              {view.showDiscount ? <td className="px-2 py-2 text-right">{formatQty(line.discountPercent)}%</td> : null}
              {view.showTax ? <td className="px-2 py-2 text-right">{formatQty(line.taxRate)}%</td> : null}
              <td className="px-2 py-2 text-right">{formatMoney(line.total, view.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Totals({ view, accent }: { view: Presentation; accent?: string }) {
  const row = (label: string, value: string, strong = false) => (
    <div key={label} className={`flex justify-between gap-6 py-0.5 ${strong ? "text-base font-semibold" : "text-sm text-muted"}`}>
      <span className={strong ? accent : ""}>{label}</span>
      <span className={strong ? "text-ink" : ""}>{value}</span>
    </div>
  );
  return (
    <div className="mt-4 ml-auto w-full max-w-xs">
      {row("Subtotal", formatMoney(view.subtotal, view.currency))}
      {view.discountTotal > 0 ? row("Discount given", formatMoney(view.discountTotal, view.currency)) : null}
      {view.showTax ? row(view.taxLabel, formatMoney(view.taxTotal, view.currency)) : null}
      {row("Total", formatMoney(view.total, view.currency), true)}
      {view.type === "invoice" && view.amountPaid > 0 ? row("Amount paid", formatMoney(view.amountPaid, view.currency)) : null}
      {view.type === "invoice" && view.amountPaid > 0 ? row("Balance due", formatMoney(view.balance, view.currency), true) : null}
      {view.priceNote ? <p className="pt-1 text-xs text-muted">{view.priceNote}</p> : null}
    </div>
  );
}

function Extras({ view }: { view: Presentation }) {
  return (
    <>
      {view.notes || view.terms ? (
        <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          {view.notes ? (
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-muted">NOTES</p>
              <p className="mt-1 whitespace-pre-wrap">{view.notes}</p>
            </div>
          ) : null}
          {view.terms ? (
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-muted">TERMS</p>
              <p className="mt-1 whitespace-pre-wrap">{view.terms}</p>
            </div>
          ) : null}
        </div>
      ) : null}
      {view.banks.length ? (
        <div className="mt-6 text-sm">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-muted">PAYMENT DETAILS</p>
          <p className="mt-1 text-xs text-muted">Use {view.number} as the payment reference.</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {view.banks.map((bank) => (
              <div key={bank.id}>
                <p className="font-semibold">{bank.bankName}</p>
                {bank.accountName ? <p>{bank.accountName}</p> : null}
                {bank.accountNumber ? <p>Account {bank.accountNumber}</p> : null}
                {bank.branch ? <p>Branch {bank.branch}</p> : null}
                {bank.swift ? <p>Swift {bank.swift}</p> : null}
                {bank.currency ? <p>{bank.currency}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {view.fiscal ? (
        <div className="mt-6 rounded-md border border-line p-3 text-sm">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-muted">FISCAL DETAILS</p>
          {view.fiscal.number ? <p className="mt-1">Fiscal number {view.fiscal.number}</p> : null}
          {view.fiscal.deviceId ? <p>Device {view.fiscal.deviceId}</p> : null}
          {view.fiscal.verificationCode ? <p>Verification {view.fiscal.verificationCode}</p> : null}
          {view.fiscal.qr ? <p className="mt-1 break-all text-xs text-muted">{view.fiscal.qr}</p> : null}
        </div>
      ) : null}
      {view.type === "quotation" ? (
        <div className="mt-8 max-w-xs text-sm">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-muted">CUSTOMER ACCEPTANCE</p>
          <div className="mt-8 border-b border-ink" />
          <p className="mt-1 text-xs text-muted">Signature and date</p>
        </div>
      ) : null}
    </>
  );
}

function DraftMark({ status }: { status: string }) {
  if (status !== "draft") return null;
  return <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-amber-800">DRAFT</span>;
}

function Classic({ view }: { view: Presentation }) {
  return (
    <article className="paper relative bg-white px-8 py-8 text-ink shadow-[0_18px_50px_rgba(28,36,31,0.12)] font-serif">
      <header className="border-b-4 border-double border-ink pb-4 text-center">
        {view.logo ? <img src={view.logo} alt="" className="mx-auto mb-3 h-16 w-auto max-w-[160px] object-contain" /> : null}
        <h2 className="text-2xl">{view.companyName}</h2>
        {view.showLegalName ? <p className="text-sm text-muted">{view.legalName}</p> : null}
        {view.companyLines.map((entry) => (
          <p key={entry} className="text-sm text-muted">{entry}</p>
        ))}
        {view.companyMeta.length ? <p className="mt-1 text-xs">{view.companyMeta.join(" · ")}</p> : null}
      </header>
      <div className="mt-5 flex items-start justify-between gap-6">
        <div>
          <p className="text-[10px] tracking-[0.16em] text-muted">BILL TO</p>
          <p className="mt-1 text-lg">{view.clientName}</p>
          {view.clientLines.map((entry) => (
            <p key={entry} className="text-sm">{entry}</p>
          ))}
          {view.clientMeta.map((entry) => (
            <p key={entry} className="text-sm">{entry}</p>
          ))}
        </div>
        <div className="text-right">
          <p className="text-xl">{view.title}</p>
          <DraftMark status={view.status} />
          <p className="mt-1">{view.number}</p>
          <p className="text-sm">Issued {formatDate(view.issueDate)}</p>
          {view.secondaryDate ? <p className="text-sm">{view.secondaryDateLabel} {formatDate(view.secondaryDate)}</p> : null}
          {view.reference ? <p className="text-sm">Ref {view.reference}</p> : null}
        </div>
      </div>
      <Items view={view} headClass="border-b border-ink text-xs uppercase tracking-wide" />
      <Totals view={view} />
      <Extras view={view} />
    </article>
  );
}

function Modern({ view }: { view: Presentation }) {
  return (
    <article className="paper relative border-l-8 border-moss bg-white px-8 py-8 text-ink shadow-[0_18px_50px_rgba(28,36,31,0.12)]">
      <div className="flex items-start justify-between gap-6">
        <div>
          {view.logo ? <img src={view.logo} alt="" className="mb-3 h-14 w-auto max-w-[150px] object-contain" /> : null}
          <h2 className="font-serif text-3xl text-moss">{view.companyName}</h2>
          {view.companyLines.map((entry) => (
            <p key={entry} className="text-sm text-muted">{entry}</p>
          ))}
          {view.companyMeta.length ? <p className="mt-1 text-xs">{view.companyMeta.join(" · ")}</p> : null}
        </div>
        <div className="text-right">
          <p className="font-serif text-2xl">{view.title}</p>
          <DraftMark status={view.status} />
          <p className="mt-1 font-semibold">{view.number}</p>
          <p className="text-sm text-muted">Issued {formatDate(view.issueDate)}</p>
          {view.secondaryDate ? <p className="text-sm text-muted">{view.secondaryDateLabel} {formatDate(view.secondaryDate)}</p> : null}
        </div>
      </div>
      <div className="mt-5 rounded-lg bg-emerald-50/70 px-4 py-3 text-sm">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-moss">BILL TO</p>
        <p className="font-semibold">{view.clientName}</p>
        {view.clientLines.map((entry) => (
          <p key={entry}>{entry}</p>
        ))}
      </div>
      <Items view={view} headClass="bg-moss text-left text-xs uppercase tracking-wide text-white" />
      <Totals view={view} accent="text-moss" />
      <Extras view={view} />
    </article>
  );
}

function Minimal({ view }: { view: Presentation }) {
  return (
    <article className="paper relative bg-white px-10 py-10 text-ink shadow-[0_18px_50px_rgba(28,36,31,0.12)]">
      <div className="flex items-start justify-between">
        <div>
          {view.logo ? <img src={view.logo} alt="" className="mb-4 h-12 w-auto max-w-[120px] object-contain" /> : null}
          <p className="text-sm">{view.companyName}</p>
          {view.companyLines.map((entry) => (
            <p key={entry} className="text-xs text-muted">{entry}</p>
          ))}
        </div>
        <p className="font-serif text-4xl text-stone-300">{view.title}</p>
      </div>
      <div className="mt-10 flex justify-between gap-6 text-sm">
        <div>
          <p className="text-[10px] tracking-[0.18em] text-muted">BILL TO</p>
          <p className="mt-2">{view.clientName}</p>
          {view.clientLines.map((entry) => (
            <p key={entry} className="text-muted">{entry}</p>
          ))}
        </div>
        <div className="text-right">
          <DraftMark status={view.status} />
          <p>{view.number}</p>
          <p className="text-muted">{formatDate(view.issueDate)}</p>
          {view.secondaryDate ? <p className="text-muted">{view.secondaryDateLabel} {formatDate(view.secondaryDate)}</p> : null}
        </div>
      </div>
      <Items view={view} headClass="border-b border-stone-300 text-[11px] uppercase tracking-[0.14em] text-muted" />
      <Totals view={view} />
      <Extras view={view} />
    </article>
  );
}

function Corporate({ view }: { view: Presentation }) {
  return (
    <article className="paper relative overflow-hidden bg-white text-ink shadow-[0_18px_50px_rgba(28,36,31,0.12)]">
      <header className="flex items-start justify-between gap-6 bg-sidebar px-8 py-6 text-stone-100">
        <div>
          {view.logo ? <img src={view.logo} alt="" className="mb-3 h-12 w-auto max-w-[140px] object-contain" /> : null}
          <h2 className="font-serif text-3xl text-white">{view.companyName}</h2>
          {view.showLegalName ? <p className="text-sm text-stone-300">{view.legalName}</p> : null}
        </div>
        <div className="text-right">
          <p className="text-sm uppercase tracking-[0.18em] text-brass">{view.title}</p>
          <p className="mt-1 text-lg">{view.number}</p>
          <DraftMark status={view.status} />
        </div>
      </header>
      <div className="grid gap-4 bg-[#efeae1] px-8 py-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-[10px] tracking-[0.16em] text-muted">BILL TO</p>
          <p className="font-semibold">{view.clientName}</p>
          {view.clientLines.map((entry) => (
            <p key={entry}>{entry}</p>
          ))}
        </div>
        <div className="sm:text-right">
          <p>Issued {formatDate(view.issueDate)}</p>
          {view.secondaryDate ? <p>{view.secondaryDateLabel} {formatDate(view.secondaryDate)}</p> : null}
          {view.reference ? <p>Ref {view.reference}</p> : null}
          {view.companyMeta.length ? <p className="text-muted">{view.companyMeta.join(" · ")}</p> : null}
        </div>
      </div>
      <div className="px-8 py-6">
        <Items view={view} headClass="bg-sidebar text-left text-xs uppercase tracking-wide text-white" zebra />
        <Totals view={view} />
        <Extras view={view} />
      </div>
    </article>
  );
}

export function DocumentPaper({ view }: { view: Presentation }) {
  if (view.templateId === "modern") return <Modern view={view} />;
  if (view.templateId === "minimal") return <Minimal view={view} />;
  if (view.templateId === "corporate") return <Corporate view={view} />;
  return <Classic view={view} />;
}
