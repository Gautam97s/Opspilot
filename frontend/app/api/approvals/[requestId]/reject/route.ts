import { NextResponse } from "next/server";

const BACKEND_URL = process.env.OPSPILOT_BACKEND_URL ?? "http://localhost:8000";

export async function POST(
  _request: Request,
  context: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await context.params;
  const resp = await fetch(`${BACKEND_URL}/approvals/${requestId}/reject`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  const text = await resp.text();
  return new NextResponse(text, {
    status: resp.status,
    headers: { "Content-Type": resp.headers.get("content-type") ?? "application/json" },
  });
}
