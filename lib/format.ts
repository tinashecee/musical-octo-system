const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function todayISO(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(iso: string, days: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() + days);
  return todayISO(date);
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return iso;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export function formatQty(value: number) {
  if (!Number.isFinite(value)) return "0";
  const fixed = (Math.round((value + Number.EPSILON) * 1000) / 1000).toFixed(3);
  return fixed.replace(/0+$/, "").replace(/\.$/, "");
}

export function formatMoney(amount: number, currency: string) {
  const sign = amount < 0 ? "-" : "";
  const [whole, fraction] = Math.abs(amount).toFixed(2).split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const prefix = currency === "USD" ? "US$" : currency === "ZIG" ? "ZiG" : currency || "";
  return `${sign}${prefix} ${withCommas}.${fraction}`;
}

export function formatAddress(parts: {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  country?: string;
}) {
  return [parts.addressLine1, parts.addressLine2, parts.city, parts.country].filter(Boolean).join(", ");
}

export function companyDisplayName(company: { tradingName?: string; legalName?: string } | null | undefined) {
  return company?.tradingName?.trim() || company?.legalName?.trim() || "Your company";
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    accepted: "Accepted",
    declined: "Declined",
    expired: "Expired",
    partially_supplied: "Part supplied",
    partially_paid: "Part paid",
    paid: "Paid",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}
