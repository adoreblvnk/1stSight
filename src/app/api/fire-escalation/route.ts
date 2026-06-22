import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Legacy single-incident escalation analysis is disabled. Use /api/live/analyze with an incidentId." },
    { status: 410 },
  );
}
