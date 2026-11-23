"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/Banner";
import { blankProfile } from "@/lib/defaults";
import type { BankAccount, CompanyProfile } from "@/lib/types";
import { CURRENCIES } from "@/lib/types";

export function ProfileForm({ initial }: { initial: CompanyProfile | null }) {
  const router = useRouter();
  const [profile, setProfile] = useState<CompanyProfile>(initial || blankProfile());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function set<K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function setBank(id: string, patch: Partial<BankAccount>) {
    setProfile((current) => ({
      ...current,
      banks: current.banks.map((bank) => (bank.id === id ? { ...bank, ...patch } : bank)),
    }));
  }

  async function onLogo(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("Use a PNG or JPG logo so it can be printed on the PDF.");
      return;
    }
    if (file.size > 800_000) {
      setError("Logo must be under 800 KB.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read that file."));
      reader.readAsDataURL(file);
    });
    set("logoDataUrl", dataUrl);
  }

  async function onSave() {
    setPending(true);
    setError("");
    setNotice("");
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not save the profile.");
      setPending(false);
      return;
    }
    setProfile(data.profile);
    setNotice("Profile saved. New documents will use these details.");
    setPending(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="font-serif text-4xl">Company profile</h1>
        <p className="mt-2 max-w-2xl text-muted">This is the business printed on every quotation and invoice. Nothing is hardcoded, so the same desk can be used for any company.</p>
      </div>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="font-serif text-2xl md:col-span-2">Business</h2>
        <label>
          <span className="label">Legal name</span>
          <input className="field" value={profile.legalName} onChange={(event) => set("legalName", event.target.value)} />
        </label>
        <label>
          <span className="label">Trading name</span>
          <input className="field" value={profile.tradingName} onChange={(event) => set("tradingName", event.target.value)} />
        </label>
        <div className="md:col-span-2">
          <span className="label">Logo</span>
          <div className="flex flex-wrap items-center gap-4">
            {profile.logoDataUrl ? <img src={profile.logoDataUrl} alt="Company logo" className="h-16 w-auto max-w-[180px] rounded border border-line bg-white object-contain p-2" /> : <div className="flex h-16 w-28 items-center justify-center rounded border border-dashed border-line text-xs text-muted">No logo</div>}
            <input type="file" accept="image/png,image/jpeg" onChange={(event) => onLogo(event.target.files?.[0])} />
            {profile.logoDataUrl ? <button type="button" className="btn-secondary" onClick={() => set("logoDataUrl", null)}>Remove</button> : null}
          </div>
        </div>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="font-serif text-2xl md:col-span-2">Contact and address</h2>
        <label><span className="label">Email</span><input className="field" value={profile.email} onChange={(event) => set("email", event.target.value)} /></label>
        <label><span className="label">Phone</span><input className="field" value={profile.phone} onChange={(event) => set("phone", event.target.value)} /></label>
        <label className="md:col-span-2"><span className="label">Website</span><input className="field" value={profile.website} onChange={(event) => set("website", event.target.value)} /></label>
        <label><span className="label">Address line 1</span><input className="field" value={profile.addressLine1} onChange={(event) => set("addressLine1", event.target.value)} /></label>
        <label><span className="label">Address line 2</span><input className="field" value={profile.addressLine2} onChange={(event) => set("addressLine2", event.target.value)} /></label>
        <label><span className="label">City</span><input className="field" value={profile.city} onChange={(event) => set("city", event.target.value)} /></label>
        <label><span className="label">Country</span><input className="field" value={profile.country} onChange={(event) => set("country", event.target.value)} /></label>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-3">
        <h2 className="font-serif text-2xl md:col-span-3">Tax and currency</h2>
        <label><span className="label">TIN</span><input className="field" value={profile.tin} onChange={(event) => set("tin", event.target.value)} /></label>
        <label><span className="label">VAT number</span><input className="field" value={profile.vatNumber} onChange={(event) => set("vatNumber", event.target.value)} /></label>
        <label><span className="label">ZIMRA BP number</span><input className="field" value={profile.zimraBpNumber} onChange={(event) => set("zimraBpNumber", event.target.value)} /></label>
        <label>
          <span className="label">Default currency</span>
          <select className="field" value={profile.defaultCurrency} onChange={(event) => set("defaultCurrency", event.target.value)}>
            {CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}
          </select>
        </label>
        <label><span className="label">Default VAT %</span><input type="number" min="0" max="100" step="0.01" className="field" value={profile.defaultVatRate} onChange={(event) => set("defaultVatRate", Number(event.target.value))} /></label>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="font-serif text-2xl md:col-span-2">Numbering and defaults</h2>
        <label><span className="label">Quotation prefix</span><input className="field" value={profile.quotationPrefix} onChange={(event) => set("quotationPrefix", event.target.value)} /></label>
        <label><span className="label">Next quotation number</span><input type="number" min="1" className="field" value={profile.nextQuotationNumber} onChange={(event) => set("nextQuotationNumber", Number(event.target.value))} /></label>
        <label><span className="label">Invoice prefix</span><input className="field" value={profile.invoicePrefix} onChange={(event) => set("invoicePrefix", event.target.value)} /></label>
        <label><span className="label">Next invoice number</span><input type="number" min="1" className="field" value={profile.nextInvoiceNumber} onChange={(event) => set("nextInvoiceNumber", Number(event.target.value))} /></label>
        <label><span className="label">Quotation valid for (days)</span><input type="number" min="0" className="field" value={profile.defaultValidityDays} onChange={(event) => set("defaultValidityDays", Number(event.target.value))} /></label>
        <label><span className="label">Invoice due after (days)</span><input type="number" min="0" className="field" value={profile.defaultPaymentDays} onChange={(event) => set("defaultPaymentDays", Number(event.target.value))} /></label>
        <label className="md:col-span-2"><span className="label">Default notes</span><textarea className="field min-h-20" value={profile.defaultNotes} onChange={(event) => set("defaultNotes", event.target.value)} /></label>
        <label className="md:col-span-2"><span className="label">Default terms</span><textarea className="field min-h-28" value={profile.defaultTerms} onChange={(event) => set("defaultTerms", event.target.value)} /></label>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">Bank accounts</h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => set("banks", [...profile.banks, { id: crypto.randomUUID(), bankName: "", accountName: "", accountNumber: "", branch: "", swift: "", currency: profile.defaultCurrency }])}
          >
            Add account
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">These accounts are printed on quotations and invoices.</p>
        <div className="mt-4 space-y-4">
          {profile.banks.map((bank) => (
            <div key={bank.id} className="grid gap-3 rounded-xl border border-line p-3 md:grid-cols-3">
              <label><span className="label">Bank</span><input className="field" value={bank.bankName} onChange={(event) => setBank(bank.id, { bankName: event.target.value })} /></label>
              <label><span className="label">Account name</span><input className="field" value={bank.accountName} onChange={(event) => setBank(bank.id, { accountName: event.target.value })} /></label>
              <label><span className="label">Account number</span><input className="field" value={bank.accountNumber} onChange={(event) => setBank(bank.id, { accountNumber: event.target.value })} /></label>
              <label><span className="label">Branch</span><input className="field" value={bank.branch} onChange={(event) => setBank(bank.id, { branch: event.target.value })} /></label>
              <label><span className="label">Swift</span><input className="field" value={bank.swift} onChange={(event) => setBank(bank.id, { swift: event.target.value })} /></label>
              <label><span className="label">Currency</span><input className="field" value={bank.currency} onChange={(event) => setBank(bank.id, { currency: event.target.value.toUpperCase() })} /></label>
              <button type="button" className="btn-danger md:col-span-3" onClick={() => set("banks", profile.banks.filter((entry) => entry.id !== bank.id))}>Remove account</button>
            </div>
          ))}
          {profile.banks.length === 0 ? <p className="text-sm text-muted">No bank account yet.</p> : null}
        </div>
      </section>

      <button type="button" className="btn-primary" disabled={pending} onClick={onSave}>{pending ? "Saving…" : "Save profile"}</button>
    </div>
  );
}
