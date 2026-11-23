export const CURRENCIES = ["USD", "ZIG", "ZAR", "BWP", "GBP", "EUR"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const TEMPLATE_IDS = ["classic", "modern", "minimal", "corporate"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export type DocType = "quotation" | "invoice";
export type VatMode = "exclusive" | "inclusive";
export type QuotationStatus = "draft" | "sent" | "accepted" | "declined" | "expired";
export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_supplied"
  | "partially_paid"
  | "paid"
  | "cancelled";
export type DocumentStatus = QuotationStatus | InvoiceStatus;

export type BankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  swift: string;
  currency: string;
};

export type CompanyDetails = {
  legalName: string;
  tradingName: string;
  logoDataUrl: string | null;
  email: string;
  phone: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
  tin: string;
  vatNumber: string;
  zimraBpNumber: string;
  banks: BankAccount[];
};

export type CompanyProfile = CompanyDetails & {
  defaultCurrency: string;
  defaultVatRate: number;
  quotationPrefix: string;
  invoicePrefix: string;
  nextQuotationNumber: number;
  nextInvoiceNumber: number;
  defaultValidityDays: number;
  defaultPaymentDays: number;
  defaultNotes: string;
  defaultTerms: string;
  updatedAt: string;
};

export type ClientSnapshot = {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
  tin: string;
  vatNumber: string;
};

export type Client = ClientSnapshot & {
  id: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  suppliedQuantity: number | null;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
};

export type BusinessDocument = {
  id: string;
  type: DocType;
  number: string;
  status: DocumentStatus;
  clientId: string | null;
  clientSnapshot: ClientSnapshot;
  companySnapshot: CompanyDetails;
  issueDate: string;
  dueDate: string | null;
  validUntil: string | null;
  currency: string;
  vatMode: VatMode;
  notes: string;
  terms: string;
  templateId: TemplateId;
  customerReference: string;
  items: LineItem[];
  amountPaid: number;
  sourceQuotationId: string | null;
  invoiceId: string | null;
  fiscalNumber: string;
  fiscalDeviceId: string;
  fiscalVerificationCode: string;
  fiscalQrPayload: string;
  fiscalizedAt: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppSettings = {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromName: string;
    fromEmail: string;
  };
  whatsapp: {
    mode: "link" | "api";
    businessPhoneId: string;
    accessToken: string;
  };
  zimra: {
    enabled: boolean;
    deviceId: string;
    apiUrl: string;
    apiKey: string;
  };
};

export type StoreData = {
  profile: CompanyProfile | null;
  clients: Client[];
  documents: BusinessDocument[];
  settings: AppSettings;
};

export type DocumentFormState = {
  clientId: string | null;
  clientSnapshot: ClientSnapshot;
  issueDate: string;
  dueDate: string;
  validUntil: string;
  currency: string;
  vatMode: VatMode;
  notes: string;
  terms: string;
  templateId: TemplateId;
  customerReference: string;
  items: LineItem[];
  amountPaid: number;
  status: DocumentStatus;
  fiscalNumber: string;
  fiscalDeviceId: string;
  fiscalVerificationCode: string;
  fiscalQrPayload: string;
  number: string;
};

export type LinkedDoc = { id: string; number: string };
