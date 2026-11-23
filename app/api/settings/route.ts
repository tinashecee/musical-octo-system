import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { getSettings, publicSettings, saveSettings } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ settings: publicSettings(getSettings()) });
}

export async function PUT(request: Request) {
  try {
    const settings = saveSettings(await readJson(request));
    return NextResponse.json({ settings });
  } catch (error) {
    return fail(error);
  }
}
