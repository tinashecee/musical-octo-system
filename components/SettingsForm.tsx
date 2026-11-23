"use client";

import { useState } from "react";
import { Banner } from "@/components/Banner";

type PublicSettings = {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    fromName: string;
    fromEmail: string;
    passwordSet: boolean;
  };
  whatsapp: { mode: "link" | "api"; businessPhoneId: string; tokenSet: boolean };
  zimra: { enabled: boolean; deviceId: string; apiUrl: string; apiKeySet: boolean };
  emailReady: boolean;
};

export function SettingsForm({ initial }: { initial: PublicSettings }) {
  const [settings, setSettings] = useState(initial);
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testTo, setTestTo] = useState(initial.smtp.fromEmail);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function onSave() {
    setPending("save");
    setError("");
    setNotice("");
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        smtp: { ...settings.smtp, password },
        whatsapp: { ...settings.whatsapp, accessToken: token },
        zimra: { ...settings.zimra, apiKey },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not save settings.");
      setPending(null);
      return;
    }
    setSettings(data.settings);
    setPassword("");
    setToken("");
    setApiKey("");
    setNotice("Settings saved on this computer.");
    setPending(null);
  }

  async function sendTest() {
    setPending("test");
    setError("");
    setNotice("");
    const response = await fetch("/api/settings/test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testTo }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "The test email could not be sent.");
      setPending(null);
      return;
    }
    setNotice(`Test email sent to ${testTo || "the from address"}.`);
    setPending(null);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-serif text-4xl">Settings</h1>
        <p className="mt-2 text-muted">WhatsApp opens a chat today. Email sends a PDF once SMTP is filled in. ZIMRA fiscalization is stored here for when that connection is switched on.</p>
      </div>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}

      <section className="card space-y-3 p-5">
        <h2 className="font-serif text-2xl">Email</h2>
        <p className="text-sm text-muted">Use the outgoing mail server from your email host. Port 465 usually wants the secure option on. Port 587 usually wants it off. The password stays in the data file on this computer.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className="label">SMTP host</span><input className="field" value={settings.smtp.host} onChange={(event) => setSettings({ ...settings, smtp: { ...settings.smtp, host: event.target.value } })} /></label>
          <label><span className="label">Port</span><input type="number" className="field" value={settings.smtp.port} onChange={(event) => setSettings({ ...settings, smtp: { ...settings.smtp, port: Number(event.target.value) } })} /></label>
          <label className="flex items-center gap-2 md:col-span-2"><input type="checkbox" checked={settings.smtp.secure} onChange={(event) => setSettings({ ...settings, smtp: { ...settings.smtp, secure: event.target.checked } })} /> Use a secure connection</label>
          <label><span className="label">Username</span><input className="field" value={settings.smtp.user} onChange={(event) => setSettings({ ...settings, smtp: { ...settings.smtp, user: event.target.value } })} /></label>
          <label><span className="label">Password</span><input type="password" className="field" value={password} placeholder={settings.smtp.passwordSet ? "Saved on this computer" : ""} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></label>
          <label><span className="label">From name</span><input className="field" value={settings.smtp.fromName} onChange={(event) => setSettings({ ...settings, smtp: { ...settings.smtp, fromName: event.target.value } })} /></label>
          <label><span className="label">From email</span><input className="field" value={settings.smtp.fromEmail} onChange={(event) => setSettings({ ...settings, smtp: { ...settings.smtp, fromEmail: event.target.value } })} /></label>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-64 flex-1"><span className="label">Send a test to</span><input className="field" value={testTo} onChange={(event) => setTestTo(event.target.value)} /></label>
          <button type="button" className="btn-secondary" disabled={Boolean(pending)} onClick={sendTest}>{pending === "test" ? "Sending…" : "Send test"}</button>
        </div>
        <p className="text-sm text-muted">{settings.emailReady ? "Email is ready to send PDFs." : "Save a host and from address before sending a test."}</p>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-serif text-2xl">WhatsApp</h2>
        <p className="text-sm text-muted">Sending opens WhatsApp with a prepared message and downloads the PDF for you to attach. The Business API fields are kept for a later connection and are not used yet.</p>
        <label>
          <span className="label">How to send</span>
          <select className="field" value={settings.whatsapp.mode} onChange={(event) => setSettings({ ...settings, whatsapp: { ...settings.whatsapp, mode: event.target.value as "link" | "api" } })}>
            <option value="link">Open a WhatsApp chat</option>
            <option value="api">WhatsApp Business API (not connected yet)</option>
          </select>
        </label>
        <label><span className="label">Business phone number ID</span><input className="field" value={settings.whatsapp.businessPhoneId} onChange={(event) => setSettings({ ...settings, whatsapp: { ...settings.whatsapp, businessPhoneId: event.target.value } })} /></label>
        <label><span className="label">Access token</span><input type="password" className="field" value={token} placeholder={settings.whatsapp.tokenSet ? "Saved on this computer" : ""} onChange={(event) => setToken(event.target.value)} autoComplete="new-password" /></label>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-serif text-2xl">ZIMRA fiscalization</h2>
        <Banner tone="info">Fiscalization is not active. Invoices can be issued now, and any codes you record on an invoice still print on the PDF. Details saved here will be used when the ZIMRA connection is switched on.</Banner>
        <label className="flex items-center gap-2"><input type="checkbox" checked={settings.zimra.enabled} onChange={(event) => setSettings({ ...settings, zimra: { ...settings.zimra, enabled: event.target.checked } })} /> Keep fiscalization details for later</label>
        <label><span className="label">Device ID</span><input className="field" value={settings.zimra.deviceId} onChange={(event) => setSettings({ ...settings, zimra: { ...settings.zimra, deviceId: event.target.value } })} /></label>
        <label><span className="label">API address</span><input className="field" value={settings.zimra.apiUrl} onChange={(event) => setSettings({ ...settings, zimra: { ...settings.zimra, apiUrl: event.target.value } })} /></label>
        <label><span className="label">API key</span><input type="password" className="field" value={apiKey} placeholder={settings.zimra.apiKeySet ? "Saved on this computer" : ""} onChange={(event) => setApiKey(event.target.value)} autoComplete="new-password" /></label>
      </section>

      <button type="button" className="btn-primary" disabled={pending === "save"} onClick={onSave}>{pending === "save" ? "Saving…" : "Save settings"}</button>
    </div>
  );
}
