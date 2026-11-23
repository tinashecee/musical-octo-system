import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { createClient, listClients } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ clients: listClients() });
}

export async function POST(request: Request) {
  try {
    const client = createClient(await readJson(request));
    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
