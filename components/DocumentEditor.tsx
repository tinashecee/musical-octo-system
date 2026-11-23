"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Banner } from "@/components/Banner";
import { DocumentPaper } from "@/components/DocumentPaper";
import { StatusBadge } from "@/components/StatusBadge";
import { deriveStatus, isShortSupplied, stageOf } from "@/lib/calc";
import { blankForm, newLine, toForm } from "@/lib/defaults";
import { companyDisplayName, formatDate, formatMoney } from "@/lib/format";
import { mailtoUrl, whatsappMessage, whatsappUrl } from "@/lib/phone";
import { formToPresentSource, present } from "@/lib/present";
import { TEMPLATES } from "@/lib/templates";
import type { BusinessDocument, Client, CompanyProfile, DocType, DocumentFormState, DocumentStatus, LineItem, LinkedDoc } from "@/lib/types";
import { CURRENCIES } from "@/lib/types";

type Props = {
  type: DocType;
  initial: BusinessDocument | null;
  profile: CompanyProfile | null;
  clients: Client[];
  linked: LinkedDoc | null;
  source: LinkedDoc | null;
};

export function DocumentEditor({ type, initial, profile, clients: initialClients, linked, source }: Props) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [docId, setDocId] = useState(initial?.id ?? null);
  const [form, setForm] = useState<DocumentFormState>(() => (initial ? toForm(initial) : profile ? blankForm(type, profile) : blankFallback(type)));
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<"email" | "whatsapp" | null>(null);
  const [emailTo, setEmailTo] = useState(initial?.clientSnapshot.email || "");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const locked = type === "quotation" && Boolean(initial?.invoiceId || linked);
  const noun = type === "quotation" ? "quotation" : "invoice";
  const listHref = type === "quotation" ? "/quotations" : "/invoices";

  useEffect(() => {
    const flash = sessionStorage.getItem("doc-flash");
    if (flash) {
      setNotice(flash);
      sessionStorage.removeItem("doc-flash");
    }
  }, []);

  const previewCompany = initial && initial.status !== "draft" ? initial.companySnapshot : profile;
  const view = useMemo(() => {
    const status = deriveStatus({ ...form, type, amountPaid: Number(form.amountPaid) || 0 });
    return present(formToPresentSource(type, { ...form, status }), previewCompany);
  }, [form, previewCompany, type]);

  if (!profile || !previewCompany) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="font-serif text-4xl">Add your company profile first</h1>
        <p className="mt-3 text-muted">Quotations and invoices print your name, logo, address, tax numbers, and bank details from the profile.</p>
        <Link href="/profile" className="btn-primary mt-6 inline-flex">Set up profile</Link>
      </div>
    );
  }

  function patchItem(id: string, patch: Partial<LineItem>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if (type === "invoice" && patch.quantity != null && item.suppliedQuantity === item.quantity) {
          next.suppliedQuantity = patch.quantity;
        }
        return next;
      }),
    }));
  }

  function applyClient(id: string) {
    const client = clients.find((entry) => entry.id === id);
    if (!client) {
      setForm((current) => ({ ...current, clientId: null }));
      return;
    }
    setForm((current) => ({
      ...current,
      clientId: client.id,
      clientSnapshot: {
        name: client.name,
        contactPerson: client.contactPerson,
        email: client.email,
        phone: client.phone,
        addressLine1: client.addressLine1,
        addressLine2: client.addressLine2,
        city: client.city,
        country: client.country,
        tin: client.tin,
        vatNumber: client.vatNumber,
      },
    }));
  }

  async function persist(status: DocumentStatus, options?: { navigate?: boolean }) {
    setError("");
    const response = await fetch(docId ? `/api/documents/${docId}` : "/api/documents", {
      method: docId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, status, type }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not save.");
      return null;
    }
    const saved = data.document as BusinessDocument;
    const path = `${listHref}/${saved.id}`;
    const created = !docId;
    setDocId(saved.id);
    setForm(toForm(saved));
    if (options?.navigate === false) {
      if (created) window.history.replaceState(null, "", path);
      return saved;
    }
    if (created) {
      sessionStorage.setItem("doc-flash", "Saved");
      router.replace(path);
    } else {
      setNotice("Saved");
      router.refresh();
    }
    return saved;
  }

  async function onSave(status: DocumentStatus) {
    setPending("save");
    await persist(status);
    setPending(null);
  }

  async function onAccept() {
    setPending("accept");
    setError("");
    const saved = await persist(form.status === "accepted" ? "draft" : form.status, { navigate: false });
    if (!saved) {
      setPending(null);
      return;
    }
    const response = await fetch(`/api/documents/${saved.id}/accept`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "The quotation could not be accepted.");
      setPending(null);
      return;
    }
    sessionStorage.setItem("doc-flash", `Invoice ${data.invoice.number} was created. Adjust supplied quantities if something was not delivered.`);
    router.replace(`/invoices/${data.invoice.id}`);
  }

  async function onDownload() {
    setPending("pdf");
    if (locked && docId) {
      window.open(`/api/documents/${docId}/pdf`, "_blank", "noopener,noreferrer");
      setPending(null);
      return;
    }
    const saved = await persist(form.status, { navigate: false });
    if (saved) window.open(`/api/documents/${saved.id}/pdf`, "_blank", "noopener,noreferrer");
    setPending(null);
  }

  async function openEmail() {
    setPending("email");
    const saved = locked && docId ? initial : await persist(form.status, { navigate: false });
    if (!saved) {
      setPending(null);
      return;
    }
    const issued = present(saved, saved.status === "draft" ? profile : saved.companySnapshot);
    setEmailTo(saved.clientSnapshot.email);
    setEmailSubject(`${issued.title} ${saved.number} from ${issued.companyName}`);
    const due = issued.secondaryDate ? `${issued.secondaryDateLabel}: ${formatDate(issued.secondaryDate)}.` : "";
    setEmailBody(`Good day ${saved.clientSnapshot.contactPerson || saved.clientSnapshot.name},\n\nPlease find ${issued.title} ${saved.number} from ${issued.companyName} for ${formatMoney(issued.total, issued.currency)}.\n${due}\nThank you.`);
    setPanel("email");
    setPending(null);
  }

  async function sendEmail() {
    if (!docId) return;
    setPending("email-send");
    setError("");
    const response = await fetch(`/api/documents/${docId}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: emailTo, subject: emailSubject, message: emailBody }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Email could not be sent.");
      setPending(null);
      return;
    }
    setForm(toForm(data.document));
    setNotice("Email sent with the PDF attached.");
    setPanel(null);
    setPending(null);
    router.refresh();
  }

  async function openWhatsapp() {
    setPending("whatsapp");
    const nextStatus: DocumentStatus = form.status === "draft" ? "sent" : form.status;
    const saved = locked && docId ? initial : await persist(nextStatus, { navigate: false });
    if (!saved) {
      setPending(null);
      return;
    }
    const issued = present(saved, saved.companySnapshot?.legalName ? saved.companySnapshot : profile);
    const message = whatsappMessage({
      contact: saved.clientSnapshot.contactPerson || saved.clientSnapshot.name,
      company: issued.companyName,
      title: issued.title,
      number: saved.number,
      total: formatMoney(issued.total, issued.currency),
      dueLabel: issued.secondaryDateLabel,
      due: formatDate(issued.secondaryDate),
    });
    const url = whatsappUrl(saved.clientSnapshot.phone, message, saved.clientSnapshot.country || profile.country);
    if (!url) {
      setError("Add a WhatsApp number with a country code. Local numbers starting with 0 are used only when the country is Zimbabwe.");
      setPending(null);
      return;
    }
    window.open(`/api/documents/${saved.id}/pdf`, "_blank", "noopener,noreferrer");
    window.open(url, "_blank", "noopener,noreferrer");
    setNotice("WhatsApp is open. Attach the downloaded PDF in the chat.");
    setPending(null);
  }

  async function saveAsClient() {
    setPending("client");
    setError("");
    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.clientSnapshot),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "The client could not be saved.");
      setPending(null);
      return;
    }
    setClients((current) => [...current, data.client]);
    setForm((current) => ({ ...current, clientId: data.client.id }));
    setNotice("Client saved for next time.");
    setPending(null);
  }

  async function onDelete() {
    if (!docId || !window.confirm("Delete this draft?")) return;
    setPending("delete");
    const response = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not delete.");
      setPending(null);
      return;
    }
    router.replace(listHref);
  }

  const short = type === "invoice" && isShortSupplied(form.items);
  const companyName = companyDisplayName(profile);

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={listHref} className="text-sm text-moss">All {type === "quotation" ? "quotations" : "invoices"}</Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-4xl">{form.number || `New ${noun}`}</h1>
            <StatusBadge status={view.status} />
          </div>
          <p className="mt-1 text-sm text-muted">{companyName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Total</p>
          <p className="font-serif text-3xl">{formatMoney(view.total, form.currency)}</p>
        </div>
      </div>

      {error ? <div className="mb-4"><Banner tone="error">{error}</Banner></div> : null}
      {notice ? <div className="mb-4"><Banner tone="ok">{notice}</Banner></div> : null}
      {linked ? (
        <div className="mb-4">
          <Banner tone="info">This quotation was accepted. Change quantities on <Link className="underline" href={`/invoices/${linked.id}`}>invoice {linked.number}</Link>.</Banner>
        </div>
      ) : null}
      {source ? (
        <div className="mb-4">
          <Banner tone="info">Created from <Link className="underline" href={`/quotations/${source.id}`}>quotation {source.number}</Link>. The amount uses the supplied quantity, so you can reduce a line that was not delivered.</Banner>
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        {locked ? null : (
          <button type="button" className="btn-primary" disabled={Boolean(pending)} onClick={() => onSave(form.status)}>
            {pending === "save" ? "Saving…" : "Save"}
          </button>
        )}
        <button type="button" className="btn-secondary" disabled={Boolean(pending)} onClick={onDownload}>Download PDF</button>
        <button type="button" className="btn-secondary" disabled={Boolean(pending)} onClick={openEmail}>Email</button>
        <button type="button" className="btn-secondary" disabled={Boolean(pending)} onClick={openWhatsapp}>WhatsApp</button>
        {type === "quotation" && !locked && form.status !== "declined" && form.status !== "expired" ? (
          <button type="button" className="btn-secondary" disabled={Boolean(pending)} onClick={onAccept}>
            {pending === "accept" ? "Creating invoice…" : "Accept and create invoice"}
          </button>
        ) : null}
        {!locked && docId && (form.status === "draft" || form.status === "declined") ? (
          <button type="button" className="btn-danger" disabled={Boolean(pending)} onClick={onDelete}>Delete draft</button>
        ) : null}
      </div>

      {panel === "email" ? (
        <section className="card mb-5 p-4">
          <h2 className="font-serif text-2xl">Send by email</h2>
          <p className="mt-1 text-sm text-muted">Sending attaches the PDF. A draft is marked sent when the email goes out. If SMTP is not set up yet, use the mail app and attach the PDF yourself.</p>
          <div className="mt-4 grid gap-3">
            <label><span className="label">To</span><input className="field" value={emailTo} onChange={(event) => setEmailTo(event.target.value)} /></label>
            <label><span className="label">Subject</span><input className="field" value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} /></label>
            <label><span className="label">Message</span><textarea className="field min-h-32" value={emailBody} onChange={(event) => setEmailBody(event.target.value)} /></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={pending === "email-send"} onClick={sendEmail}>{pending === "email-send" ? "Sending…" : "Send PDF by email"}</button>
            <a className="btn-secondary" href={mailtoUrl({ to: emailTo, subject: emailSubject, body: `${emailBody}\n\nPlease attach the downloaded PDF.` })}>Open mail app</a>
            <button type="button" className="btn-secondary" onClick={() => setPanel(null)}>Close</button>
            <Link href="/settings" className="btn-secondary">Email settings</Link>
          </div>
        </section>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="space-y-5">
          <section className="card p-4">
            <h2 className="font-serif text-2xl">Template</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  disabled={locked}
                  aria-pressed={form.templateId === template.id}
                  onClick={() => setForm({ ...form, templateId: template.id })}
                  className={`rounded-xl border px-3 py-3 text-left ${form.templateId === template.id ? "border-moss bg-emerald-50" : "border-line bg-white"}`}
                >
                  <span className="block font-semibold">{template.name}</span>
                  <span className="block text-sm text-muted">{template.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card p-4">
            <h2 className="font-serif text-2xl">Bill to</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="label">Saved client</span>
                <select className="field" disabled={locked} value={form.clientId || ""} onChange={(event) => applyClient(event.target.value)}>
                  <option value="">Type details for this document</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </label>
              <Field label="Name" value={form.clientSnapshot.name} disabled={locked} onChange={(value) => setSnapshot(setForm, { name: value })} />
              <Field label="Contact person" value={form.clientSnapshot.contactPerson} disabled={locked} onChange={(value) => setSnapshot(setForm, { contactPerson: value })} />
              <Field label="Email" value={form.clientSnapshot.email} disabled={locked} onChange={(value) => setSnapshot(setForm, { email: value })} />
              <Field label="WhatsApp / phone" value={form.clientSnapshot.phone} disabled={locked} onChange={(value) => setSnapshot(setForm, { phone: value })} />
              <Field label="Address" value={form.clientSnapshot.addressLine1} disabled={locked} onChange={(value) => setSnapshot(setForm, { addressLine1: value })} />
              <Field label="City" value={form.clientSnapshot.city} disabled={locked} onChange={(value) => setSnapshot(setForm, { city: value })} />
              <Field label="Country" value={form.clientSnapshot.country} disabled={locked} onChange={(value) => setSnapshot(setForm, { country: value })} />
              <Field label="TIN" value={form.clientSnapshot.tin} disabled={locked} onChange={(value) => setSnapshot(setForm, { tin: value })} />
            </div>
            <p className="mt-3 text-sm text-muted">These details are kept on this document. Editing the client later does not change it.</p>
            {!locked && !form.clientId && form.clientSnapshot.name ? (
              <button type="button" className="btn-secondary mt-3" disabled={Boolean(pending)} onClick={saveAsClient}>Save as a client</button>
            ) : null}
          </section>

          <section className="card p-4">
            <h2 className="font-serif text-2xl">Details</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <label>
                <span className="label">Issue date</span>
                <input type="date" className="field" disabled={locked} value={form.issueDate} onChange={(event) => setForm({ ...form, issueDate: event.target.value })} />
              </label>
              {type === "quotation" ? (
                <label>
                  <span className="label">Valid until</span>
                  <input type="date" className="field" disabled={locked} value={form.validUntil} onChange={(event) => setForm({ ...form, validUntil: event.target.value })} />
                </label>
              ) : (
                <label>
                  <span className="label">Due date</span>
                  <input type="date" className="field" disabled={locked} value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
                </label>
              )}
              <label>
                <span className="label">Customer reference</span>
                <input className="field" disabled={locked} value={form.customerReference} onChange={(event) => setForm({ ...form, customerReference: event.target.value })} />
              </label>
              <label>
                <span className="label">Currency</span>
                <select className="field" disabled={locked} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}>
                  {CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}
                </select>
              </label>
              <label>
                <span className="label">VAT</span>
                <select className="field" disabled={locked} value={form.vatMode} onChange={(event) => setForm({ ...form, vatMode: event.target.value as DocumentFormState["vatMode"] })}>
                  <option value="exclusive">Prices exclude VAT</option>
                  <option value="inclusive">Prices include VAT</option>
                </select>
              </label>
              {form.status === "accepted" ? null : (
                <label>
                  <span className="label">Stage</span>
                  <select className="field" disabled={locked} value={stageOf(form.status, type)} onChange={(event) => setForm({ ...form, status: event.target.value as DocumentStatus })}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    {type === "quotation" ? <option value="declined">Declined</option> : null}
                    {type === "quotation" ? <option value="expired">Expired</option> : null}
                    {type === "invoice" ? <option value="cancelled">Cancelled</option> : null}
                  </select>
                </label>
              )}
            </div>
            {type === "invoice" ? (
              <label className="mt-3 block max-w-xs">
                <span className="label">Amount paid</span>
                <input type="number" min="0" step="0.01" className="field" disabled={locked} value={form.amountPaid} onChange={(event) => setForm({ ...form, amountPaid: Number(event.target.value) })} />
              </label>
            ) : null}
            <p className="mt-3 text-sm text-muted">
              {type === "invoice"
                ? "Status follows the stage, the supplied quantities, and the amount paid."
                : "Accepting the quotation creates an invoice you can still edit."}
              {short && form.status === "draft" ? " Short supply will show as part supplied once you mark it sent." : ""}
            </p>
          </section>

          <section className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-2xl">Lines</h2>
              {locked ? null : (
                <button type="button" className="btn-secondary" onClick={() => setForm({ ...form, items: [...form.items, newLine(profile.defaultVatRate, type)] })}>Add line</button>
              )}
            </div>
            {type === "invoice" ? <p className="mt-2 text-sm text-muted">Amount is calculated from the supplied quantity. Lower it, or remove the line, when something was not supplied.</p> : null}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    <th className="pb-2">Description</th>
                    <th className="pb-2">Qty</th>
                    {type === "invoice" ? <th className="bg-amber-50 pb-2 pl-2">Supplied</th> : null}
                    <th className="pb-2">Unit</th>
                    <th className="pb-2">Price</th>
                    <th className="pb-2">Disc %</th>
                    <th className="pb-2">VAT %</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="py-1 pr-2"><input className="field" disabled={locked} value={item.description} onChange={(event) => patchItem(item.id, { description: event.target.value })} /></td>
                      <td className="py-1 pr-2"><input type="number" min="0" step="any" className="field w-20" disabled={locked} value={item.quantity} onChange={(event) => patchItem(item.id, { quantity: Number(event.target.value) })} /></td>
                      {type === "invoice" ? (
                        <td className="bg-amber-50 py-1 pr-2 pl-2">
                          <input type="number" min="0" step="any" className="field w-24" disabled={locked} value={item.suppliedQuantity ?? item.quantity} onChange={(event) => patchItem(item.id, { suppliedQuantity: Number(event.target.value) })} />
                        </td>
                      ) : null}
                      <td className="py-1 pr-2"><input className="field w-16" disabled={locked} value={item.unit} onChange={(event) => patchItem(item.id, { unit: event.target.value })} /></td>
                      <td className="py-1 pr-2"><input type="number" min="0" step="0.01" className="field w-28" disabled={locked} value={item.unitPrice} onChange={(event) => patchItem(item.id, { unitPrice: Number(event.target.value) })} /></td>
                      <td className="py-1 pr-2"><input type="number" min="0" max="100" step="0.01" className="field w-20" disabled={locked} value={item.discountPercent} onChange={(event) => patchItem(item.id, { discountPercent: Number(event.target.value) })} /></td>
                      <td className="py-1 pr-2"><input type="number" min="0" max="100" step="0.01" className="field w-20" disabled={locked} value={item.taxRate} onChange={(event) => patchItem(item.id, { taxRate: Number(event.target.value) })} /></td>
                      <td className="py-1">{locked || form.items.length === 1 ? null : <button type="button" className="text-sm text-red-800" onClick={() => setForm({ ...form, items: form.items.filter((entry) => entry.id !== item.id) })}>Remove</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card grid gap-3 p-4 md:grid-cols-2">
            <label>
              <span className="label">Notes</span>
              <textarea className="field min-h-28" disabled={locked} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </label>
            <label>
              <span className="label">Terms</span>
              <textarea className="field min-h-28" disabled={locked} value={form.terms} onChange={(event) => setForm({ ...form, terms: event.target.value })} />
            </label>
          </section>

          {type === "invoice" ? (
            <section className="card p-4">
              <h2 className="font-serif text-2xl">Fiscal details</h2>
              <p className="mt-2 text-sm text-muted">ZIMRA fiscalization from this app is not connected yet. If you fiscalize this invoice elsewhere, record the codes here and they will print on the PDF.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field label="Fiscal number" value={form.fiscalNumber} disabled={locked} onChange={(value) => setForm({ ...form, fiscalNumber: value })} />
                <Field label="Device ID" value={form.fiscalDeviceId} disabled={locked} onChange={(value) => setForm({ ...form, fiscalDeviceId: value })} />
                <Field label="Verification code" value={form.fiscalVerificationCode} disabled={locked} onChange={(value) => setForm({ ...form, fiscalVerificationCode: value })} />
                <Field label="QR or verification link" value={form.fiscalQrPayload} disabled={locked} onChange={(value) => setForm({ ...form, fiscalQrPayload: value })} />
              </div>
            </section>
          ) : null}
        </div>

        <aside className="xl:sticky xl:top-6">
          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">Preview · {TEMPLATES.find((template) => template.id === form.templateId)?.name}</p>
          <DocumentPaper view={view} />
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="field" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function setSnapshot(setForm: React.Dispatch<React.SetStateAction<DocumentFormState>>, patch: Partial<DocumentFormState["clientSnapshot"]>) {
  setForm((current) => ({ ...current, clientSnapshot: { ...current.clientSnapshot, ...patch } }));
}

function blankFallback(type: DocType): DocumentFormState {
  return {
    clientId: null,
    clientSnapshot: { name: "", contactPerson: "", email: "", phone: "", addressLine1: "", addressLine2: "", city: "", country: "", tin: "", vatNumber: "" },
    issueDate: "",
    dueDate: "",
    validUntil: "",
    currency: "USD",
    vatMode: "exclusive",
    notes: "",
    terms: "",
    templateId: "classic",
    customerReference: "",
    items: [],
    amountPaid: 0,
    status: "draft",
    fiscalNumber: "",
    fiscalDeviceId: "",
    fiscalVerificationCode: "",
    fiscalQrPayload: "",
    number: type === "quotation" ? "" : "",
  };
}
