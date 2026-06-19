import { NextResponse } from "next/server";
import { analyzeFireEscalation } from "@/lib/ai/pipelines";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await analyzeFireEscalation({
    videoSrc: typeof body.videoSrc === "string" ? body.videoSrc : undefined,
    timestampSeconds: typeof body.timestampSeconds === "number" ? body.timestampSeconds : undefined,
    source: typeof body.source === "string" ? body.source : undefined,
  }).catch((error) => {
    console.error("fire escalation analysis unavailable", error);
    return null;
  });

  if (!result) {
    return NextResponse.json({ error: "Live fire escalation analysis is unavailable. Check the server model/API configuration." }, { status: 502 });
  }

  return NextResponse.json(result);
}
