import fs from "fs";
import path from "path";
import { deriveStatus } from "./calc";
import { blankSettings } from "./defaults";
import { todayISO, addDays } from "./format";
import { StoreError } from "./errors";
import { isTemplateId } from "./templates";
import type {
  AppSettings,
  BankAccount,
  BusinessDocument,
  Client,
  ClientSnapshot,
  CompanyDetails,
  CompanyProfile,
  DocType,
  DocumentStatus,
  LineItem,
  StoreData,
  TemplateId,
  VatMode,
} from "./types";
import { CURRENCIES } from "./types";

const dataDir = path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "store.json");

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function asString(value: unknown, max = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function asNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function asDate(value: unknown, fallback: string) {
  const text = asString(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
}

function asCurrency(value: unknown, fallback: string) {
  const text = asString(value, 8).toUpperCase();
  return (CURRENCIES as readonly string[]).includes(text) ? text : fallback;
}

function asPrefix(value: unknown, fallback: string) {
  const text = asString(value, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return text || fallback;
}

function asLogo(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new StoreError("The logo could not be read.");
  if (!value.startsWith("data:image/png") && !value.startsWith("data:image/jpeg")) {
    throw new StoreError("Use a PNG or JPG logo so it can be printed on the PDF.");
  }
  if (value.length > 1_200_000) throw new StoreError("Logo is too large. Use an image under 800 KB.");
  return value;
}

function looksLikeEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function nowIso() {
  return new Date().toISOString();
}

function emptyStore(): StoreData {
  return { profile: null, clients: [], documents: [], settings: blankSettings() };
}

function mergeSettings(value: unknown): AppSettings {
  const defaults = blankSettings();
  const record = asRecord(value);
  const smtp = asRecord(record.smtp);
  const whatsapp = asRecord(record.whatsapp);
  const zimra = asRecord(record.zimra);
  return {
    smtp: {
      host: asString(smtp.host, 200),
      port: clamp(Math.round(asNumber(smtp.port, defaults.smtp.port)), 1, 65535),
      secure: Boolean(smtp.secure),
      user: asString(smtp.user, 200),
      password: typeof smtp.password === "string" ? smtp.password : "",
      fromName: asString(smtp.fromName, 200),
      fromEmail: asString(smtp.fromEmail, 200),
    },
    whatsapp: {
      mode: whatsapp.mode === "api" ? "api" : "link",
      businessPhoneId: asString(whatsapp.businessPhoneId, 80),
      accessToken: typeof whatsapp.accessToken === "string" ? whatsapp.accessToken : "",
    },
    zimra: {
      enabled: Boolean(zimra.enabled),
      deviceId: asString(zimra.deviceId, 80),
      apiUrl: asString(zimra.apiUrl, 300),
      apiKey: typeof zimra.apiKey === "string" ? zimra.apiKey : "",
    },
  };
}

function readStore(): StoreData {
  try {
    if (!fs.existsSync(storePath)) return emptyStore();
    const parsed = JSON.parse(fs.readFileSync(storePath, "utf8")) as Partial<StoreData>;
    return {
      profile: parsed.profile ?? null,
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      settings: mergeSettings(parsed.settings),
    };
  } catch (error) {
    if (error instanceof StoreError) throw error;
    throw new StoreError("The saved records could not be read.", 500);
  }
}

function writeStore(store: StoreData) {
  fs.mkdirSync(dataDir, { recursive: true });
  const temporary = `${storePath}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(store, null, 2), "utf8");
  fs.copyFileSync(temporary, storePath);
  fs.unlinkSync(temporary);
}

function mutate<T>(change: (store: StoreData) => T): T {
  const store = readStore();
  const result = change(store);
  writeStore(store);
  return result;
}

function snapshotFromProfile(profile: CompanyProfile): CompanyDetails {
  return {
    legalName: profile.legalName,
    tradingName: profile.tradingName,
    logoDataUrl: profile.logoDataUrl,
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    addressLine1: profile.addressLine1,
    addressLine2: profile.addressLine2,
    city: profile.city,
    country: profile.country,
    tin: profile.tin,
    vatNumber: profile.vatNumber,
    zimraBpNumber: profile.zimraBpNumber,
    banks: profile.banks.map((bank) => ({ ...bank })),
  };
}

function sanitizeBanks(value: unknown): BankAccount[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 12)
    .map((entry) => {
      const bank = asRecord(entry);
      return {
        id: asString(bank.id, 80) || crypto.randomUUID(),
        bankName: asString(bank.bankName, 120),
        accountName: asString(bank.accountName, 160),
        accountNumber: asString(bank.accountNumber, 80),
        branch: asString(bank.branch, 120),
        swift: asString(bank.swift, 20),
        currency: asString(bank.currency, 8).toUpperCase(),
      };
    })
    .filter((bank) => bank.bankName || bank.accountName || bank.accountNumber);
}

function sanitizeProfile(input: unknown, existing: CompanyProfile | null): CompanyProfile {
  const record = asRecord(input);
  const base = existing;
  const legalName = asString(record.legalName, 180);
  if (!legalName) throw new StoreError("Enter the legal name of the business.");
  const email = asString(record.email, 180);
  if (!looksLikeEmail(email)) throw new StoreError("Enter a valid company email, or leave it blank.");
  const nextQuotationNumber = Math.max(1, Math.round(asNumber(record.nextQuotationNumber, base?.nextQuotationNumber || 1)));
  const nextInvoiceNumber = Math.max(1, Math.round(asNumber(record.nextInvoiceNumber, base?.nextInvoiceNumber || 1)));
  return {
    legalName,
    tradingName: asString(record.tradingName, 180),
    logoDataUrl: asLogo(record.logoDataUrl),
    email,
    phone: asString(record.phone, 40),
    website: asString(record.website, 180),
    addressLine1: asString(record.addressLine1, 180),
    addressLine2: asString(record.addressLine2, 180),
    city: asString(record.city, 80),
    country: asString(record.country, 80),
    tin: asString(record.tin, 40),
    vatNumber: asString(record.vatNumber, 40),
    zimraBpNumber: asString(record.zimraBpNumber, 40),
    banks: sanitizeBanks(record.banks),
    defaultCurrency: asCurrency(record.defaultCurrency, base?.defaultCurrency || "USD"),
    defaultVatRate: clamp(asNumber(record.defaultVatRate, base?.defaultVatRate ?? 15), 0, 100),
    quotationPrefix: asPrefix(record.quotationPrefix, "QT"),
    invoicePrefix: asPrefix(record.invoicePrefix, "INV"),
    nextQuotationNumber,
    nextInvoiceNumber,
    defaultValidityDays: clamp(Math.round(asNumber(record.defaultValidityDays, 14)), 0, 365),
    defaultPaymentDays: clamp(Math.round(asNumber(record.defaultPaymentDays, 7)), 0, 365),
    defaultNotes: asString(record.defaultNotes, 2000),
    defaultTerms: asString(record.defaultTerms, 4000),
    updatedAt: nowIso(),
  };
}

function sanitizeSnapshot(value: unknown): ClientSnapshot {
  const record = asRecord(value);
  const email = asString(record.email, 180);
  if (!looksLikeEmail(email)) throw new StoreError("Enter a valid client email, or leave it blank.");
  return {
    name: asString(record.name, 180),
    contactPerson: asString(record.contactPerson, 180),
    email,
    phone: asString(record.phone, 40),
    addressLine1: asString(record.addressLine1, 180),
    addressLine2: asString(record.addressLine2, 180),
    city: asString(record.city, 80),
    country: asString(record.country, 80),
    tin: asString(record.tin, 40),
    vatNumber: asString(record.vatNumber, 40),
  };
}

function sanitizeClient(input: unknown, existing?: Client): Client {
  const record = asRecord(input);
  const snapshot = sanitizeSnapshot(record);
  if (!snapshot.name) throw new StoreError("Enter the client name.");
  const timestamp = nowIso();
  return {
    ...snapshot,
    id: existing?.id || crypto.randomUUID(),
    notes: asString(record.notes, 2000),
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

function quotationStatuses(status: string): status is DocumentStatus {
  return ["draft", "sent", "accepted", "declined", "expired"].includes(status);
}

function invoiceStage(status: string) {
  if (status === "draft" || status === "cancelled") return status;
  if (["sent", "partially_supplied", "partially_paid", "paid"].includes(status)) return "sent";
  return "draft";
}

function sanitizeItems(value: unknown, type: DocType, defaultTax: number): LineItem[] {
  if (!Array.isArray(value)) throw new StoreError("Add at least one line.");
  if (value.length > 200) throw new StoreError("A document can have at most 200 lines.");
  const seen = new Set<string>();
  const items = value.map((entry) => {
    const record = asRecord(entry);
    let id = asString(record.id, 80);
    if (!id || seen.has(id)) id = crypto.randomUUID();
    seen.add(id);
    const quantity = Math.max(0, asNumber(record.quantity, 1));
    let supplied: number | null =
      record.suppliedQuantity == null || record.suppliedQuantity === ""
        ? null
        : Math.max(0, asNumber(record.suppliedQuantity, quantity));
    if (type === "quotation") supplied = null;
    if (type === "invoice" && supplied == null) supplied = quantity;
    return {
      id,
      description: asString(record.description, 500),
      quantity,
      suppliedQuantity: supplied,
      unit: asString(record.unit, 24) || "ea",
      unitPrice: Math.max(0, asNumber(record.unitPrice, 0)),
      discountPercent: clamp(asNumber(record.discountPercent, 0), 0, 100),
      taxRate: clamp(asNumber(record.taxRate, defaultTax), 0, 100),
    };
  });
  if (items.some((item) => !item.description && item.unitPrice > 0)) {
    throw new StoreError("Each priced line needs a description.");
  }
  const kept = items.filter((item) => item.description);
  if (!kept.length) throw new StoreError("Add at least one line with a description.");
  return kept;
}

function allocateNumber(store: StoreData, profile: CompanyProfile, type: DocType, issueDate: string) {
  const year = Number(issueDate.slice(0, 4)) || new Date().getFullYear();
  const prefix = type === "quotation" ? profile.quotationPrefix : profile.invoicePrefix;
  let sequence = type === "quotation" ? profile.nextQuotationNumber : profile.nextInvoiceNumber;
  if (!Number.isFinite(sequence) || sequence < 1) sequence = 1;
  let number = "";
  do {
    number = `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
    sequence += 1;
  } while (store.documents.some((document) => document.number === number) && sequence < 100000);
  if (type === "quotation") profile.nextQuotationNumber = sequence;
  else profile.nextInvoiceNumber = sequence;
  return number;
}

function requireProfile(store: StoreData) {
  if (!store.profile) throw new StoreError("Set up your company profile before creating a document.");
  return store.profile;
}

function buildDocument(store: StoreData, input: unknown, type: DocType, existing?: BusinessDocument): BusinessDocument {
  const profile = requireProfile(store);
  const record = asRecord(input);
  const issueDate = asDate(record.issueDate, existing?.issueDate || todayISO());
  const clientSnapshot = sanitizeSnapshot(record.clientSnapshot);
  if (!clientSnapshot.name) throw new StoreError("Enter who this document is for.");
  const clientId = asString(record.clientId, 80) || null;
  if (clientId && !store.clients.some((client) => client.id === clientId)) {
    throw new StoreError("That client could not be found. Choose them again or type the details.");
  }
  const items = sanitizeItems(record.items, type, profile.defaultVatRate);
  const requested = asString(record.status, 40) || existing?.status || "draft";
  let stage: DocumentStatus = "draft";
  if (type === "quotation") {
    if (requested === "accepted" && existing?.status !== "accepted") {
      throw new StoreError("Accept the quotation to generate an invoice.");
    }
    stage = quotationStatuses(requested) ? requested : "draft";
  } else {
    stage = invoiceStage(requested) as DocumentStatus;
  }
  const timestamp = nowIso();
  const templateValue = asString(record.templateId, 20);
  const templateId: TemplateId = isTemplateId(templateValue) ? templateValue : existing?.templateId || "classic";
  const vatMode: VatMode = record.vatMode === "inclusive" ? "inclusive" : "exclusive";
  const amountPaid = type === "invoice" ? Math.max(0, asNumber(record.amountPaid, existing?.amountPaid || 0)) : 0;
  const fiscalNumber = asString(record.fiscalNumber, 80);
  const document: BusinessDocument = {
    id: existing?.id || crypto.randomUUID(),
    type,
    number: existing?.number || allocateNumber(store, profile, type, issueDate),
    status: stage,
    clientId,
    clientSnapshot,
    companySnapshot: !existing || existing.status === "draft" ? snapshotFromProfile(profile) : existing.companySnapshot,
    issueDate,
    dueDate: type === "invoice" ? asDate(record.dueDate, existing?.dueDate || addDays(issueDate, profile.defaultPaymentDays)) : null,
    validUntil: type === "quotation" ? asDate(record.validUntil, existing?.validUntil || addDays(issueDate, profile.defaultValidityDays)) : null,
    currency: asCurrency(record.currency, existing?.currency || profile.defaultCurrency),
    vatMode,
    notes: asString(record.notes, 4000),
    terms: asString(record.terms, 4000),
    templateId,
    customerReference: asString(record.customerReference, 80),
    items,
    amountPaid,
    sourceQuotationId: existing?.sourceQuotationId || null,
    invoiceId: existing?.invoiceId || null,
    fiscalNumber,
    fiscalDeviceId: asString(record.fiscalDeviceId, 80),
    fiscalVerificationCode: asString(record.fiscalVerificationCode, 80),
    fiscalQrPayload: asString(record.fiscalQrPayload, 500),
    fiscalizedAt: fiscalNumber ? existing?.fiscalizedAt || timestamp : null,
    sentAt: existing?.sentAt || null,
    acceptedAt: existing?.acceptedAt || null,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };
  document.status = deriveStatus(document);
  if (document.status !== "draft" && document.status !== "declined" && document.status !== "expired" && document.status !== "cancelled" && !document.sentAt) {
    document.sentAt = timestamp;
  }
  return document;
}

function invoiceFromQuotation(store: StoreData, quotation: BusinessDocument): BusinessDocument {
  const profile = requireProfile(store);
  const issueDate = todayISO();
  const timestamp = nowIso();
  const items = quotation.items.map((item) => ({
    ...item,
    id: crypto.randomUUID(),
    suppliedQuantity: item.quantity,
  }));
  const invoice: BusinessDocument = {
    ...quotation,
    id: crypto.randomUUID(),
    type: "invoice",
    number: allocateNumber(store, profile, "invoice", issueDate),
    status: "draft",
    issueDate,
    dueDate: addDays(issueDate, profile.defaultPaymentDays),
    validUntil: null,
    items,
    amountPaid: 0,
    sourceQuotationId: quotation.id,
    invoiceId: null,
    fiscalNumber: "",
    fiscalDeviceId: "",
    fiscalVerificationCode: "",
    fiscalQrPayload: "",
    fiscalizedAt: null,
    sentAt: null,
    acceptedAt: null,
    companySnapshot: snapshotFromProfile(profile),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return invoice;
}

export function getProfile() {
  return readStore().profile;
}

export function saveProfile(input: unknown) {
  return mutate((store) => {
    store.profile = sanitizeProfile(input, store.profile);
    return store.profile;
  });
}

export function listClients() {
  return readStore().clients.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export function createClient(input: unknown) {
  return mutate((store) => {
    const client = sanitizeClient(input);
    store.clients.push(client);
    return client;
  });
}

export function updateClient(id: string, input: unknown) {
  return mutate((store) => {
    const index = store.clients.findIndex((client) => client.id === id);
    if (index < 0) throw new StoreError("That client could not be found.", 404);
    const client = sanitizeClient(input, store.clients[index]);
    store.clients[index] = client;
    return client;
  });
}

export function deleteClient(id: string) {
  return mutate((store) => {
    if (store.documents.some((document) => document.clientId === id)) {
      throw new StoreError("This client is used on a quotation or invoice, so the record stays. You can still edit their details.");
    }
    const next = store.clients.filter((client) => client.id !== id);
    if (next.length === store.clients.length) throw new StoreError("That client could not be found.", 404);
    store.clients = next;
    return { ok: true };
  });
}

export function listDocuments(type?: DocType) {
  return readStore()
    .documents.filter((document) => !type || document.type === type)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getDocument(id: string) {
  return readStore().documents.find((document) => document.id === id) || null;
}

export function createDocument(input: unknown) {
  return mutate((store) => {
    const type = asRecord(input).type === "invoice" ? "invoice" : "quotation";
    const document = buildDocument(store, input, type);
    store.documents.push(document);
    return document;
  });
}

export function updateDocument(id: string, input: unknown) {
  return mutate((store) => {
    const index = store.documents.findIndex((document) => document.id === id);
    if (index < 0) throw new StoreError("That document could not be found.", 404);
    const existing = store.documents[index];
    if (existing.type === "quotation" && existing.invoiceId) {
      throw new StoreError("This quotation was accepted. Edit the invoice if some quantities were not supplied.");
    }
    const document = buildDocument(store, input, existing.type, existing);
    store.documents[index] = document;
    return document;
  });
}

export function deleteDocument(id: string) {
  return mutate((store) => {
    const document = store.documents.find((entry) => entry.id === id);
    if (!document) throw new StoreError("That document could not be found.", 404);
    if (document.status !== "draft" && document.status !== "declined") {
      throw new StoreError("Only a draft can be deleted. Cancel an invoice if you need to keep the record.");
    }
    if (document.type === "quotation" && document.invoiceId) {
      throw new StoreError("This quotation already has an invoice.");
    }
    if (document.type === "invoice" && document.sourceQuotationId) {
      const quotation = store.documents.find((entry) => entry.id === document.sourceQuotationId);
      if (quotation) {
        quotation.invoiceId = null;
        quotation.status = "sent";
        quotation.acceptedAt = null;
        quotation.updatedAt = nowIso();
      }
    }
    store.documents = store.documents.filter((entry) => entry.id !== id);
    return { ok: true };
  });
}

export function acceptQuotation(id: string, input?: unknown) {
  return mutate((store) => {
    const index = store.documents.findIndex((document) => document.id === id);
    if (index < 0) throw new StoreError("That quotation could not be found.", 404);
    const quotation = store.documents[index];
    if (quotation.type !== "quotation") throw new StoreError("Only a quotation can be accepted.");
    if (quotation.invoiceId) {
      const invoice = store.documents.find((document) => document.id === quotation.invoiceId);
      if (!invoice) throw new StoreError("The linked invoice is missing.", 404);
      return { quotation, invoice };
    }
    if (quotation.status === "declined" || quotation.status === "expired") {
      throw new StoreError("Move the quotation back to a draft before accepting it.");
    }
    const current = input ? buildDocument(store, { ...asRecord(input), status: "draft" }, "quotation", { ...quotation, status: "draft", invoiceId: null }) : quotation;
    if (current.status === "declined" || current.status === "expired") {
      throw new StoreError("Move the quotation back to a draft before accepting it.");
    }
    const invoice = invoiceFromQuotation(store, current);
    current.status = "accepted";
    current.invoiceId = invoice.id;
    current.acceptedAt = nowIso();
    current.updatedAt = current.acceptedAt;
    store.documents[index] = current;
    store.documents.push(invoice);
    return { quotation: current, invoice };
  });
}

export function markDocumentSent(id: string) {
  return mutate((store) => {
    const document = store.documents.find((entry) => entry.id === id);
    if (!document) throw new StoreError("That document could not be found.", 404);
    const timestamp = nowIso();
    if (document.status === "draft") {
      document.status = deriveStatus({ ...document, status: "sent" });
    }
    if (!document.sentAt) document.sentAt = timestamp;
    document.updatedAt = timestamp;
    return document;
  });
}

export function getSettings() {
  return readStore().settings;
}

export function publicSettings(settings: AppSettings) {
  return {
    smtp: {
      host: settings.smtp.host,
      port: settings.smtp.port,
      secure: settings.smtp.secure,
      user: settings.smtp.user,
      fromName: settings.smtp.fromName,
      fromEmail: settings.smtp.fromEmail,
      passwordSet: Boolean(settings.smtp.password),
    },
    whatsapp: {
      mode: settings.whatsapp.mode,
      businessPhoneId: settings.whatsapp.businessPhoneId,
      tokenSet: Boolean(settings.whatsapp.accessToken),
    },
    zimra: {
      enabled: settings.zimra.enabled,
      deviceId: settings.zimra.deviceId,
      apiUrl: settings.zimra.apiUrl,
      apiKeySet: Boolean(settings.zimra.apiKey),
    },
    emailReady: Boolean(settings.smtp.host && (settings.smtp.fromEmail || settings.smtp.user)),
  };
}

export function saveSettings(input: unknown) {
  return mutate((store) => {
    const next = mergeSettings(input);
    if (!next.smtp.password) next.smtp.password = store.settings.smtp.password;
    if (!next.whatsapp.accessToken) next.whatsapp.accessToken = store.settings.whatsapp.accessToken;
    if (!next.zimra.apiKey) next.zimra.apiKey = store.settings.zimra.apiKey;
    if (next.smtp.fromEmail && !looksLikeEmail(next.smtp.fromEmail)) {
      throw new StoreError("Enter a valid from address for email.");
    }
    store.settings = next;
    return publicSettings(next);
  });
}
