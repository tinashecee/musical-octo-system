import { NextResponse } from "next/server";
import { deriveStatus } from "@/lib/calc";
import { formatDate, formatMoney } from "@/lib/format";
import { fail, readJson } from "@/lib/http";
import { StoreError } from "@/lib/errors";
import { deliverEmail } from "@/lib/mail";
import { renderDocumentPdf } from "@/lib/pdf";
import { present } from "@/lib/present";
import { getDocument, getProfile, getSettings, markDocumentSent } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asRecord(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = asRecord(await readJson(request));
    const existing = getDocument(id);
    if (!existing) throw new StoreError("That document could not be found.", 404);
    const profile = getProfile();
    const company = existing.companySnapshot?.legalName || existing.companySnapshot?.tradingName ? existing.companySnapshot : profile;
    if (!company) throw new StoreError("Set up your company profile first.");
    const status = existing.status === "draft" ? deriveStatus({ ...existing, status: "sent" }) : existing.status;
    const issued = { ...existing, status };
    const view = present(issued, company);
    const to = (typeof body.to === "string" ? body.to.trim() : "") || existing.clientSnapshot.email;
    if (!to) throw new StoreError("Add an email address for this client before sending.");
    const subject = (typeof body.subject === "string" && body.subject.trim()) || `${view.title} ${issued.number} from ${view.companyName}`;
    const due = view.secondaryDate ? `${view.secondaryDateLabel}: ${formatDate(view.secondaryDate)}.` : "";
    const fallback = `Good day ${existing.clientSnapshot.contactPerson || existing.clientSnapshot.name},\n\nPlease find ${view.title} ${issued.number} from ${view.companyName} for ${formatMoney(view.total, view.currency)}.\n${due}\nThe PDF is attached.\n\nThank you.`;
    const text = (typeof body.message === "string" && body.message.trim()) || fallback;
    const pdf = await renderDocumentPdf(issued, company);
    const settings = getSettings();
    await deliverEmail(settings, {
      to,
      subject: subject.slice(0, 180),
      text: text.slice(0, 4000),
      attachments: [{ filename: `${issued.number}.pdf`, content: Buffer.from(pdf) }],
    });
    const document = markDocumentSent(id);
    return NextResponse.json({ document });
  } catch (error) {
    return fail(error);
  }
}
