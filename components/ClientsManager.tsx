"use client";

import { useState } from "react";
import { Banner } from "@/components/Banner";
import { emptySnapshot } from "@/lib/defaults";
import type { Client } from "@/lib/types";

const emptyClient = (): Client => ({
  id: "",
  ...emptySnapshot(),
  notes: "",
  createdAt: "",
  updatedAt: "",
});

export function ClientsManager({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState(initialClients);
  const [draft, setDraft] = useState<Client>(emptyClient());
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const visible = clients.filter((client) => {
    const haystack = `${client.name} ${client.email} ${client.phone} ${client.city}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  function edit(client: Client) {
    setDraft(client);
    setError("");
    setNotice("");
  }

  async function onSave() {
    setPending(true);
    setError("");
    setNotice("");
    const creating = !draft.id;
    const response = await fetch(creating ? "/api/clients" : `/api/clients/${draft.id}`, {
      method: creating ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not save the client.");
      setPending(false);
      return;
    }
    const saved = data.client as Client;
    setClients((current) => {
      const next = current.filter((client) => client.id !== saved.id);
      next.push(saved);
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    setDraft(saved);
    setNotice("Client saved.");
    setPending(false);
  }

  async function onDelete() {
    if (!draft.id || !window.confirm(`Delete ${draft.name}?`)) return;
    setPending(true);
    setError("");
    const response = await fetch(`/api/clients/${draft.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not delete the client.");
      setPending(false);
      return;
    }
    setClients((current) => current.filter((client) => client.id !== draft.id));
    setDraft(emptyClient());
    setNotice("Client deleted.");
    setPending(false);
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-serif text-4xl">Clients</h1>
        </div>
        <button type="button" className="btn-primary mb-3" onClick={() => setDraft(emptyClient())}>New client</button>
        <input className="field mb-3" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="space-y-1">
          {visible.map((client) => (
            <button key={client.id} type="button" onClick={() => edit(client)} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${draft.id === client.id ? "bg-white shadow-sm" : "hover:bg-white/70"}`}>
              <span className="block font-semibold">{client.name}</span>
              <span className="block text-muted">{client.email || client.phone || "No contact yet"}</span>
            </button>
          ))}
          {visible.length === 0 ? <p className="text-sm text-muted">No clients yet.</p> : null}
        </div>
      </div>
      <section className="card p-5">
        <h2 className="font-serif text-2xl">{draft.id ? draft.name || "Client" : "New client"}</h2>
        <p className="mt-1 text-sm text-muted">Saved clients fill in new documents. Documents you already created keep the details they were given.</p>
        {error ? <div className="mt-3"><Banner tone="error">{error}</Banner></div> : null}
        {notice ? <div className="mt-3"><Banner tone="ok">{notice}</Banner></div> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
          <Field label="Contact person" value={draft.contactPerson} onChange={(value) => setDraft({ ...draft, contactPerson: value })} />
          <Field label="Email" value={draft.email} onChange={(value) => setDraft({ ...draft, email: value })} />
          <Field label="WhatsApp / phone" value={draft.phone} onChange={(value) => setDraft({ ...draft, phone: value })} />
          <Field label="Address" value={draft.addressLine1} onChange={(value) => setDraft({ ...draft, addressLine1: value })} />
          <Field label="Address line 2" value={draft.addressLine2} onChange={(value) => setDraft({ ...draft, addressLine2: value })} />
          <Field label="City" value={draft.city} onChange={(value) => setDraft({ ...draft, city: value })} />
          <Field label="Country" value={draft.country} onChange={(value) => setDraft({ ...draft, country: value })} />
          <Field label="TIN" value={draft.tin} onChange={(value) => setDraft({ ...draft, tin: value })} />
          <Field label="VAT number" value={draft.vatNumber} onChange={(value) => setDraft({ ...draft, vatNumber: value })} />
          <label className="md:col-span-2">
            <span className="label">Notes</span>
            <textarea className="field min-h-24" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn-primary" disabled={pending} onClick={onSave}>{pending ? "Saving…" : "Save client"}</button>
          {draft.id ? <button type="button" className="btn-danger" disabled={pending} onClick={onDelete}>Delete</button> : null}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="field" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
