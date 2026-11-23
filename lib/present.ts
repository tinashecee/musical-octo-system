import { summarize } from "./calc";
import { companyDisplayName, formatAddress } from "./format";
import type { BusinessDocument, CompanyDetails, DocType, DocumentFormState, VatMode } from "./types";

export type Presentation = ReturnType<typeof present>;

type PresentSource = {
  type: DocType;
  number: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  validUntil: string | null;
  currency: string;
  vatMode: VatMode;
  notes: string;
  terms: string;
  templateId: BusinessDocument["templateId"];
  customerReference: string;
  items: BusinessDocument["items"];
  amountPaid: number;
  clientSnapshot: BusinessDocument["clientSnapshot"];
  fiscalNumber?: string | null;
  fiscalDeviceId?: string | null;
  fiscalVerificationCode?: string | null;
  fiscalQrPayload?: string | null;
};

export function present(input: PresentSource, company: CompanyDetails | null) {
  const summary = summarize(input);
  const safeCompany = company || emptyCompany();
  const client = input.clientSnapshot;
  const title = input.type === "quotation" ? "Quotation" : safeCompany.vatNumber.trim() ? "Tax invoice" : "Invoice";
  const fiscalNumber = (input.fiscalNumber || "").trim();
  const fiscalDeviceId = (input.fiscalDeviceId || "").trim();
  const fiscalVerificationCode = (input.fiscalVerificationCode || "").trim();
  const fiscalQrPayload = (input.fiscalQrPayload || "").trim();
  const fiscal =
    fiscalNumber || fiscalDeviceId || fiscalVerificationCode || fiscalQrPayload
      ? { number: fiscalNumber, deviceId: fiscalDeviceId, verificationCode: fiscalVerificationCode, qr: fiscalQrPayload }
      : null;

  return {
    ...summary,
    type: input.type,
    title,
    templateId: input.templateId,
    status: input.status,
    number: input.number || "DRAFT",
    issueDate: input.issueDate,
    secondaryDateLabel: input.type === "quotation" ? "Valid until" : "Due date",
    secondaryDate: input.type === "quotation" ? input.validUntil || "" : input.dueDate || "",
    currency: input.currency,
    vatMode: input.vatMode,
    reference: input.customerReference.trim(),
    notes: input.notes.trim(),
    terms: input.terms.trim(),
    priceNote: summary.showTax ? (input.vatMode === "inclusive" ? "Prices include VAT." : "Prices exclude VAT.") : "",
    amountPaid: input.amountPaid || 0,
    balance: roundBalance(summary.total, input.amountPaid || 0),
    companyName: companyDisplayName(safeCompany),
    legalName: safeCompany.legalName.trim(),
    showLegalName: Boolean(safeCompany.tradingName.trim() && safeCompany.legalName.trim() && safeCompany.tradingName.trim() !== safeCompany.legalName.trim()),
    logo: safeCompany.logoDataUrl,
    companyLines: [
      formatAddress(safeCompany),
      [safeCompany.phone, safeCompany.email].filter(Boolean).join(" · "),
      safeCompany.website,
    ].filter(Boolean),
    companyMeta: [
      safeCompany.tin && `TIN ${safeCompany.tin}`,
      safeCompany.vatNumber && `VAT ${safeCompany.vatNumber}`,
      safeCompany.zimraBpNumber && `BP ${safeCompany.zimraBpNumber}`,
    ].filter(Boolean) as string[],
    clientName: client.name.trim() || "Client",
    clientLines: [
      client.contactPerson,
      formatAddress(client),
      [client.phone, client.email].filter(Boolean).join(" · "),
    ].filter(Boolean),
    clientMeta: [client.tin && `TIN ${client.tin}`, client.vatNumber && `VAT ${client.vatNumber}`].filter(Boolean) as string[],
    banks: safeCompany.banks.filter((bank) => bank.bankName || bank.accountNumber || bank.accountName),
    fiscal,
  };
}

function roundBalance(total: number, paid: number) {
  return Math.round((total - paid + Number.EPSILON) * 100) / 100;
}

function emptyCompany(): CompanyDetails {
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
    country: "",
    tin: "",
    vatNumber: "",
    zimraBpNumber: "",
    banks: [],
  };
}

export function formToPresentSource(type: DocType, form: DocumentFormState): PresentSource {
  return {
    type,
    number: form.number,
    status: form.status,
    issueDate: form.issueDate,
    dueDate: form.dueDate || null,
    validUntil: form.validUntil || null,
    currency: form.currency,
    vatMode: form.vatMode,
    notes: form.notes,
    terms: form.terms,
    templateId: form.templateId,
    customerReference: form.customerReference,
    items: form.items,
    amountPaid: Number(form.amountPaid) || 0,
    clientSnapshot: form.clientSnapshot,
    fiscalNumber: form.fiscalNumber,
    fiscalDeviceId: form.fiscalDeviceId,
    fiscalVerificationCode: form.fiscalVerificationCode,
    fiscalQrPayload: form.fiscalQrPayload,
  };
}
