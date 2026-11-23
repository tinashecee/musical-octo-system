import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { createDocument, listDocuments } from "@/lib/store";
import type { DocType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type");
  const filter: DocType | undefined = type === "invoice" || type === "quotation" ? type : undefined;
  return NextResponse.json({ documents: listDocuments(filter) });
}

export async function POST(request: Request) {
  try {
    const document = createDocument(await readJson(request));
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
