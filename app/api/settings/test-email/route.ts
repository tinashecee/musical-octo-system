import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { StoreError } from "@/lib/errors";
import { deliverEmail } from "@/lib/mail";
import { getProfile, getSettings } from "@/lib/store";
import { companyDisplayName } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await readJson(request)) as { to?: string };
    const settings = getSettings();
    const profile = getProfile();
    const to = (body.to || settings.smtp.fromEmail || settings.smtp.user || "").trim();
    if (!to) throw new StoreError("Enter an address to receive the test, or save a from address first.");
    const company = companyDisplayName(profile);
    await deliverEmail(settings, {
      to,
      subject: `Test email from ${company}`,
      text: `This is a test from your quotation and invoicing desk.\n\nIf you can read it, quotations and invoices can be sent with a PDF attached.\n\n${company}`,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
