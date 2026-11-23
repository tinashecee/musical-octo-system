import { NextResponse } from "next/server";
import { renderDocumentPdf } from "@/lib/pdf";
import { getDocument, getProfile } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const document = getDocument(id);
    if (!document) return NextResponse.json({ error: "That document could not be found." }, { status: 404 });
    const profile = getProfile();
    const company = document.companySnapshot?.legalName || document.companySnapshot?.tradingName ? document.companySnapshot : profile;
    if (!company) return NextResponse.json({ error: "Set up your company profile first." }, { status: 400 });
    const buffer = await renderDocumentPdf(document, company);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${document.number}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "The PDF could not be created." }, { status: 500 });
  }
}
