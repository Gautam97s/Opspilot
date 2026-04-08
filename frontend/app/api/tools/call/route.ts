import { NextResponse } from "next/server";

const BACKEND_URL = process.env.OPSPILOT_BACKEND_URL ?? "http://localhost:8000";

type CallBody = {
  name: string;
  arguments?: Record<string, unknown>;
};

export async function POST(req: Request) {
  const body = (await req.json()) as CallBody;

  const payload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: {
      name: body.name,
      arguments: body.arguments ?? {},
    },
  };

  const resp = await fetch(`${BACKEND_URL}/tools/call`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await resp.text();
  return new NextResponse(text, {
    status: resp.status,
    headers: { "Content-Type": resp.headers.get("content-type") ?? "application/json" },
  });
}

