export function whatsappNumber(phone: string, country?: string) {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && (country || "").trim().toLowerCase() === "zimbabwe") {
    digits = `263${digits.slice(1)}`;
  }
  if (digits.startsWith("0") || digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export function whatsappUrl(phone: string, message: string, country?: string) {
  const number = whatsappNumber(phone, country);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function whatsappMessage(options: {
  contact: string;
  company: string;
  title: string;
  number: string;
  total: string;
  dueLabel: string;
  due: string;
}) {
  const who = options.contact.trim() || "there";
  const when = options.due ? `\n${options.dueLabel}: ${options.due}.` : "";
  return `Good day ${who},\n\nPlease find ${options.title} ${options.number} from ${options.company} for ${options.total}.${when}\n\nI will attach the PDF in this chat.\n\nThank you.`;
}

export function mailtoUrl(options: { to: string; subject: string; body: string }) {
  const params = new URLSearchParams({ subject: options.subject, body: options.body });
  return `mailto:${options.to}?${params.toString()}`;
}
