import { NextResponse } from "next/server";
import { StoreError } from "./errors";

export function fail(error: unknown) {
  if (error instanceof StoreError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong on this computer." }, { status: 500 });
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new StoreError("The request could not be read.");
  }
}
