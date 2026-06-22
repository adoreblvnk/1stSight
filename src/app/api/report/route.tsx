import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    { error: "Static PDF export is disabled. Run post-incident analysis and POST the runtime analysis payload to /api/report/export." },
    { status: 410 },
  );
}
