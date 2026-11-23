import type { DocType, LineItem, VatMode, DocumentStatus } from "./types";

export type LineMath = {
  id: string;
  description: string;
  quantity: number;
  supplied: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
  discount: number;
  net: number;
  tax: number;
  total: number;
};

export type Summary = {
  lines: LineMath[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  taxLabel: string;
  showSupplied: boolean;
  showDiscount: boolean;
  showTax: boolean;
};

function toCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100);
}

function fromCents(cents: number) {
  return cents / 100;
}

export function billableQuantity(item: LineItem, type: DocType) {
  if (type === "invoice") {
    return item.suppliedQuantity == null ? item.quantity : item.suppliedQuantity;
  }
  return item.quantity;
}

export function summarize(input: { type: DocType; vatMode: VatMode; items: LineItem[] }): Summary {
  const lines: LineMath[] = input.items.map((item, index) => {
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    const supplied = billableQuantity(item, input.type);
    const rate = (Number.isFinite(item.taxRate) ? item.taxRate : 0) / 100;
    const discountPercent = Number.isFinite(item.discountPercent) ? item.discountPercent : 0;
    const grossCents = toCents(supplied * (Number.isFinite(item.unitPrice) ? item.unitPrice : 0));
    const discountCents = Math.round(grossCents * (discountPercent / 100));
    const afterCents = grossCents - discountCents;
    let netCents = afterCents;
    let taxCents = 0;
    let totalCents = afterCents;
    if (input.vatMode === "inclusive") {
      totalCents = afterCents;
      netCents = rate > 0 ? Math.round(totalCents / (1 + rate)) : totalCents;
      taxCents = totalCents - netCents;
    } else {
      netCents = afterCents;
      taxCents = Math.round(netCents * rate);
      totalCents = netCents + taxCents;
    }
    return {
      id: item.id || `line-${index}`,
      description: item.description,
      quantity,
      supplied,
      unit: item.unit || "",
      unitPrice: item.unitPrice || 0,
      discountPercent,
      taxRate: item.taxRate || 0,
      discount: fromCents(discountCents),
      net: fromCents(netCents),
      tax: fromCents(taxCents),
      total: fromCents(totalCents),
    };
  });

  const totalCents = lines.reduce((sum, line) => sum + toCents(line.total), 0);
  const taxCents = lines.reduce((sum, line) => sum + toCents(line.tax), 0);
  const discountCents = lines.reduce((sum, line) => sum + toCents(line.discount), 0);
  const rates = [...new Set(lines.map((line) => line.taxRate).filter((rate) => rate > 0))];

  return {
    lines,
    total: fromCents(totalCents),
    taxTotal: fromCents(taxCents),
    subtotal: fromCents(totalCents - taxCents),
    discountTotal: fromCents(discountCents),
    taxLabel: rates.length === 1 ? `VAT ${formatRate(rates[0])}` : "VAT",
    showSupplied: input.type === "invoice" && lines.some((line) => Math.abs(line.supplied - line.quantity) > 0.0001),
    showDiscount: lines.some((line) => line.discountPercent > 0),
    showTax: lines.some((line) => line.taxRate > 0) || taxCents > 0,
  };
}

function formatRate(rate: number) {
  return Number.isInteger(rate) ? String(rate) : String(rate);
}

export function documentTotal(doc: { type: DocType; vatMode: VatMode; items: LineItem[] }) {
  return summarize(doc).total;
}

export function documentBalance(doc: {
  type: DocType;
  vatMode: VatMode;
  items: LineItem[];
  amountPaid: number;
}) {
  return fromCents(toCents(summarize(doc).total) - toCents(doc.amountPaid || 0));
}

export function isShortSupplied(items: LineItem[]) {
  return items.some((item) => {
    const supplied = item.suppliedQuantity == null ? item.quantity : item.suppliedQuantity;
    return supplied + 0.0001 < item.quantity;
  });
}

export function deriveStatus(input: {
  type: DocType;
  status: DocumentStatus;
  items: LineItem[];
  amountPaid: number;
  vatMode: VatMode;
}): DocumentStatus {
  if (input.type === "quotation") return input.status;
  if (input.status === "draft" || input.status === "cancelled") return input.status;
  const total = summarize(input).total;
  const paid = input.amountPaid || 0;
  if (total > 0 && paid >= total - 0.009) return "paid";
  if (paid > 0) return "partially_paid";
  if (isShortSupplied(input.items)) return "partially_supplied";
  return "sent";
}

export function stageOf(status: DocumentStatus, type: DocType) {
  if (type === "invoice") {
    if (status === "draft" || status === "cancelled") return status;
    return "sent";
  }
  return status;
}
