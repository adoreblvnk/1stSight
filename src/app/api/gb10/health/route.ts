import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Gb10HealthStatus = "online" | "offline" | "not-configured";

export async function GET() {
  const baseURL = process.env.GB10_OPENAI_BASE_URL;

  if (!baseURL) {
    return NextResponse.json(
      {
        configured: false,
        reachable: false,
        status: "not-configured" satisfies Gb10HealthStatus,
        checkedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    // OpenAI Models API: https://platform.openai.com/docs/api-reference/models/list
    const response = await fetch(`${baseURL.replace(/\/$/, "")}/models`, {
      headers: process.env.GB10_OPENAI_API_KEY ? { Authorization: `Bearer ${process.env.GB10_OPENAI_API_KEY}` } : undefined,
      signal: controller.signal,
    });

    return NextResponse.json(
      {
        configured: true,
        reachable: response.ok,
        status: (response.ok ? "online" : "offline") satisfies Gb10HealthStatus,
        checkedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        configured: true,
        reachable: false,
        status: "offline" satisfies Gb10HealthStatus,
        checkedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } finally {
    clearTimeout(timeout);
  }
}
