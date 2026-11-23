import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { acceptQuotation } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = acceptQuotation(id);
    return NextResponse.json(result);
  } catch (error) {
    return fail(error);
  }
}
