import type { AppSettings, ClientSnapshot, CompanyProfile, LineItem, DocType } from "./types";
import { todayISO, addDays } from "./format";
import type { DocumentFormState } from "./types";

export function blankSettings(): AppSettings {
  return {
    smtp: {
      host: "",
      port: 587,
      secure: false,
      user: "",
      password: "",
      fromName: "",
      fromEmail: "",
    },
    whatsapp: {
      mode: "link",
      businessPhoneId: "",
      accessToken: "",
    },
    zimra: {
      enabled: false,
      deviceId: "",
      apiUrl: "",
      apiKey: "",
    },
  };
}

export function blankProfile(): CompanyProfile {
  return {
    legalName: "",
    tradingName: "",
    logoDataUrl: null,
    email: "",
    phone: "",
    website: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    country: "Zimbabwe",
    tin: "",
    vatNumber: "",
    zimraBpNumber: "",
    banks: [],
    defaultCurrency: "USD",
    defaultVatRate: 15,
    quotationPrefix: "QT",
    invoicePrefix: "INV",
    nextQuotationNumber: 1,
    nextInvoiceNumber: 1,
    defaultValidityDays: 14,
    defaultPaymentDays: 7,
    defaultNotes: "Thank you for your business.",
    defaultTerms:
      "This quotation is valid until the date shown. Supply starts once it is accepted. Invoices are payable by the due date, in the currency stated. Please use the document number as your payment reference.",
    updatedAt: new Date().toISOString(),
  };
}

export function emptySnapshot(): ClientSnapshot {
  return {
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    country: "",
    tin: "",
    vatNumber: "",
  };
}

export function newLine(taxRate: number, type: DocType): LineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    suppliedQuantity: type === "invoice" ? 1 : null,
    unit: "ea",
    unitPrice: 0,
    discountPercent: 0,
    taxRate,
  };
}

export function blankForm(type: DocType, profile: CompanyProfile): DocumentFormState {
  const issueDate = todayISO();
  return {
    clientId: null,
    clientSnapshot: emptySnapshot(),
    issueDate,
    dueDate: type === "invoice" ? addDays(issueDate, profile.defaultPaymentDays) : "",
    validUntil: type === "quotation" ? addDays(issueDate, profile.defaultValidityDays) : "",
    currency: profile.defaultCurrency,
    vatMode: "exclusive",
    notes: profile.defaultNotes,
    terms: profile.defaultTerms,
    templateId: "classic",
    customerReference: "",
    items: [newLine(profile.defaultVatRate, type)],
    amountPaid: 0,
    status: "draft",
    fiscalNumber: "",
    fiscalDeviceId: "",
    fiscalVerificationCode: "",
    fiscalQrPayload: "",
    number: "",
  };
}

export function toForm(doc: {
  clientId: string | null;
  clientSnapshot: ClientSnapshot;
  issueDate: string;
  dueDate: string | null;
  validUntil: string | null;
  currency: string;
  vatMode: DocumentFormState["vatMode"];
  notes: string;
  terms: string;
  templateId: DocumentFormState["templateId"];
  customerReference: string;
  items: LineItem[];
  amountPaid: number;
  status: DocumentFormState["status"];
  fiscalNumber: string;
  fiscalDeviceId: string;
  fiscalVerificationCode: string;
  fiscalQrPayload: string;
  number: string;
}): DocumentFormState {
  return {
    clientId: doc.clientId,
    clientSnapshot: { ...doc.clientSnapshot },
    issueDate: doc.issueDate,
    dueDate: doc.dueDate || "",
    validUntil: doc.validUntil || "",
    currency: doc.currency,
    vatMode: doc.vatMode,
    notes: doc.notes,
    terms: doc.terms,
    templateId: doc.templateId,
    customerReference: doc.customerReference,
    items: doc.items.map((item) => ({ ...item })),
    amountPaid: doc.amountPaid,
    status: doc.status,
    fiscalNumber: doc.fiscalNumber || "",
    fiscalDeviceId: doc.fiscalDeviceId || "",
    fiscalVerificationCode: doc.fiscalVerificationCode || "",
    fiscalQrPayload: doc.fiscalQrPayload || "",
    number: doc.number,
  };
}
