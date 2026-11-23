import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { deleteDocument, getDocument, updateDocument } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const document = getDocument(id);
  if (!document) return NextResponse.json({ error: "That document could not be found." }, { status: 404 });
  return NextResponse.json({ document });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const document = updateDocument(id, await readJson(request));
    return NextResponse.json({ document });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(deleteDocument(id));
  } catch (error) {
    return fail(error);
  }
}
