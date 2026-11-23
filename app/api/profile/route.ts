import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { getProfile, saveProfile } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ profile: getProfile() });
}

export async function PUT(request: Request) {
  try {
    const profile = saveProfile(await readJson(request));
    return NextResponse.json({ profile });
  } catch (error) {
    return fail(error);
  }
}
