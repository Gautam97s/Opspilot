import { NextResponse } from "next/server";

const BACKEND_URL = process.env.OPSPILOT_BACKEND_URL ?? "http://localhost:8000";

export async function GET() {
  const resp = await fetch(`${BACKEND_URL}/tools/list`, {
    // Ensure we always hit local backend during dev.
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  const text = await resp.text();
  return new NextResponse(text, {
    status: resp.status,
    headers: { "Content-Type": resp.headers.get("content-type") ?? "application/json" },
  });
}

