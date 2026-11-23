import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { deleteClient, updateClient } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const client = updateClient(id, await readJson(request));
    return NextResponse.json({ client });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(deleteClient(id));
  } catch (error) {
    return fail(error);
  }
}
